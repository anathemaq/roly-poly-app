import { NextResponse } from "next/server"
import { Receiver } from "@upstash/qstash"
import webpush from "web-push"
import { redis, KEYS, TTL } from "@/lib/redis"

function getReceiver() {
  return new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })
}

function initVapid() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:noreply@roly-poly.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

export async function POST(request: Request) {
  // Verify the request comes from QStash
  try {
    const receiver = getReceiver()
    const body = await request.text()
    const signature = request.headers.get("upstash-signature") || ""

    const isValid = await receiver.verify({
      signature,
      body,
    })

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const { deviceId, sessionId, activityId, activityName, endTime } = JSON.parse(body)

    if (!deviceId || !activityId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Check if this notification belongs to the currently active session
    // If a new day was started, the sessionId will be different and we skip
    if (sessionId) {
      const activeSession = await redis.get<string>(KEYS.activeSession(deviceId))
      if (activeSession && activeSession !== sessionId) {
        return NextResponse.json({ success: true, skipped: true, reason: "stale_session" })
      }
    }

    // Check if the activity's endTime still matches the current schedule
    // If the user changed the time, the stored schedule will have a different endTime
    const scheduleRaw = await redis.get<string>(KEYS.schedule(deviceId))
    if (scheduleRaw) {
      const schedule: Array<{ id: string; endTime: string }> =
        typeof scheduleRaw === "string" ? JSON.parse(scheduleRaw) : scheduleRaw
      const currentActivity = schedule.find((a) => a.id === activityId)
      if (currentActivity && currentActivity.endTime !== endTime) {
        // endTime was changed — this notification is stale
        return NextResponse.json({ success: true, skipped: true, reason: "stale_endTime" })
      }
    }

    // Check if already notified for this activity (regardless of endTime)
    const notifiedKey = KEYS.notified(deviceId, activityId)
    const alreadyNotified = await redis.exists(notifiedKey)
    if (alreadyNotified) {
      return NextResponse.json({ success: true, skipped: true, reason: "already_notified" })
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
    initVapid()
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Время вышло!",
        body: `Активность "${activityName}" завершена`,
        tag: `activity-${activityId}`,
      })
    )

    // Mark as notified (keyed by activityId only, prevents re-notification on time changes)
    await redis.set(KEYS.notified(deviceId, activityId), "1", { ex: TTL.notified })

    // Clean up queued flag
    await redis.del(KEYS.queued(deviceId, activityId, endTime))

    return NextResponse.json({ success: true, sent: true })
  } catch (error: unknown) {
    const pushError = error as { statusCode?: number }

    // If subscription is expired/invalid, clean it up
    if (pushError.statusCode === 410 || pushError.statusCode === 404) {
      try {
        const clonedBody = await request.clone().text()
        const { deviceId } = JSON.parse(clonedBody)
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
