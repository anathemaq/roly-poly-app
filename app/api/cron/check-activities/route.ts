import { NextResponse } from "next/server"
import webpush from "web-push"
import { redis, KEYS, TTL } from "@/lib/redis"

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:noreply@roly-poly.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface ScheduledActivity {
  id: string
  name: string
  endTime: string
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    let sent = 0
    let checked = 0

    // Scan all schedule keys
    const scheduleKeys: string[] = []
    let cursor = 0
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: "push:schedule:*",
        count: 100,
      })
      cursor = Number(nextCursor)
      scheduleKeys.push(...keys)
    } while (cursor !== 0)

    checked = scheduleKeys.length

    for (const scheduleKey of scheduleKeys) {
      // Extract deviceId from key pattern push:schedule:{deviceId}
      const deviceId = scheduleKey.replace("push:schedule:", "")

      // Get scheduled activities
      const raw = await redis.get<string>(scheduleKey)
      if (!raw) continue

      const activities: ScheduledActivity[] =
        typeof raw === "string" ? JSON.parse(raw) : raw

      // Find expired activities
      const expired = activities.filter((a) => new Date(a.endTime) <= now)
      if (expired.length === 0) continue

      // Get push subscription for this device
      const subRaw = await redis.get<string>(KEYS.subscription(deviceId))
      if (!subRaw) continue

      const subscription =
        typeof subRaw === "string" ? JSON.parse(subRaw) : subRaw

      // Send push for each expired activity (if not already notified)
      for (const activity of expired) {
        const notifiedKey = KEYS.notified(deviceId, activity.id)
        const alreadyNotified = await redis.exists(notifiedKey)
        if (alreadyNotified) continue

        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: "Время вышло!",
              body: `Активность "${activity.name}" завершена`,
              tag: `activity-${activity.id}`,
            })
          )
          // Mark as notified to prevent duplicates
          await redis.set(notifiedKey, "1", { ex: TTL.notified })
          sent++
        } catch (pushError: unknown) {
          const error = pushError as { statusCode?: number }
          // If subscription is expired/invalid, clean it up
          if (error.statusCode === 410 || error.statusCode === 404) {
            await redis.del(KEYS.subscription(deviceId))
          }
          console.error(
            `Push failed for device ${deviceId}:`,
            pushError
          )
        }
      }

      // Update schedule: remove expired activities
      const remaining = activities.filter((a) => new Date(a.endTime) > now)
      if (remaining.length === 0) {
        await redis.del(scheduleKey)
      } else {
        await redis.set(scheduleKey, JSON.stringify(remaining), {
          ex: TTL.schedule,
        })
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      sent,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Cron check-activities error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
