import { NextResponse } from "next/server"
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"
import webpush from "web-push"
import { redis, KEYS, TTL } from "@/lib/redis"

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:noreply@roly-poly.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

async function handler(request: Request) {
  try {
    const { deviceId, activityId, activityName } = await request.json()

    if (!deviceId || !activityId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Check if already notified (deduplication)
    const notifiedKey = KEYS.notified(deviceId, activityId)
    const alreadyNotified = await redis.exists(notifiedKey)
    if (alreadyNotified) {
      return NextResponse.json({ success: true, skipped: true })
    }

    // Get the push subscription
    const subRaw = await redis.get<string>(KEYS.subscription(deviceId))
    if (!subRaw) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      )
    }

    const subscription =
      typeof subRaw === "string" ? JSON.parse(subRaw) : subRaw

    // Send the push notification
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Время вышло!",
        body: `Активность "${activityName}" завершена`,
        tag: `activity-${activityId}`,
      })
    )

    // Mark as notified
    await redis.set(notifiedKey, "1", { ex: TTL.notified })

    // Clean up queued flag
    await redis.del(`push:queued:${deviceId}:${activityId}`)

    return NextResponse.json({ success: true, sent: true })
  } catch (error: unknown) {
    const pushError = error as { statusCode?: number }

    // If subscription is expired/invalid, clean it up
    if (pushError.statusCode === 410 || pushError.statusCode === 404) {
      try {
        const { deviceId } = await request.clone().json()
        if (deviceId) {
          await redis.del(KEYS.subscription(deviceId))
        }
      } catch {
        // ignore cleanup errors
      }
    }

    console.error("Push send error:", error)
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    )
  }
}

export const POST = verifySignatureAppRouter(handler)
