import { NextResponse } from "next/server"
import { Client } from "@upstash/qstash"
import { redis, KEYS, TTL } from "@/lib/redis"

function getQStashClient() {
  return new Client({ token: process.env.QSTASH_TOKEN! })
}

interface ScheduledActivity {
  id: string
  name: string
  endTime: string // ISO string
}

export async function POST(request: Request) {
  // Skip entirely if Redis or QStash are not configured (e.g. preview environment)
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN || !process.env.QSTASH_TOKEN) {
    return NextResponse.json({ success: true, scheduled: 0, reason: "not_configured" })
  }

  try {
    const { deviceId, activities, sessionId } = (await request.json()) as {
      deviceId: string
      activities: ScheduledActivity[]
      sessionId: string
    }

    if (!deviceId || !activities || !sessionId) {
      return NextResponse.json(
        { error: "deviceId, activities, and sessionId are required" },
        { status: 400 }
      )
    }

    // Store the active session — only this session's notifications will fire
    await redis.set(KEYS.activeSession(deviceId), sessionId, {
      ex: TTL.schedule,
    })

    const now = new Date()
    const pending = activities.filter((a) => new Date(a.endTime) > now)

    if (pending.length === 0) {
      await redis.del(KEYS.schedule(deviceId))
      return NextResponse.json({ success: true, scheduled: 0 })
    }

    // Save schedule to Redis (for reference)
    await redis.set(KEYS.schedule(deviceId), JSON.stringify(pending), {
      ex: TTL.schedule,
    })

    // Use the public Vercel URL (request.url may be internal on Vercel)
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : new URL(request.url).origin

    // QStash cannot call loopback/localhost — skip in preview environments
    const isLoopback = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
    if (isLoopback) {
      return NextResponse.json({ success: true, scheduled: 0, reason: "loopback_skipped" })
    }

    // Schedule a QStash message for each pending activity
    let scheduled = 0
    for (const activity of pending) {
      const notifiedKey = KEYS.notified(deviceId, activity.id, activity.endTime)
      const alreadyNotified = await redis.exists(notifiedKey)
      if (alreadyNotified) continue

      // Check if already scheduled (avoid duplicates)
      const scheduledKey = KEYS.queued(deviceId, activity.id, activity.endTime)
      const alreadyScheduled = await redis.exists(scheduledKey)
      if (alreadyScheduled) continue

      const endTime = new Date(activity.endTime)
      const delaySeconds = Math.max(
        0,
        Math.floor((endTime.getTime() - now.getTime()) / 1000)
      )

      try {
        const qstash = getQStashClient()
        await qstash.publishJSON({
          url: `${baseUrl}/api/push/send`,
          body: {
            deviceId,
            sessionId,
            activityId: activity.id,
            activityName: activity.name,
            endTime: activity.endTime,
          },
          delay: delaySeconds,
        })

        // Mark as queued with TTL matching the delay + buffer
        await redis.set(scheduledKey, "1", { ex: Math.max(delaySeconds + 300, TTL.schedule) })
        scheduled++
      } catch (err) {
        console.error(`Failed to schedule QStash for ${activity.id}:`, err)
      }
    }

    return NextResponse.json({ success: true, scheduled })
  } catch (error) {
    console.error("Push schedule error:", error)
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 }
    )
  }
}
