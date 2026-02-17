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

    const { deviceId, activityId, activityName } = JSON.parse(body)
    console.log("[v0] Push send called:", { deviceId, activityId, activityName })

    if (!deviceId || !activityId) {
      console.log("[v0] Push send: missing fields")
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
    initVapid()
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

    console.log("[v0] Push sent successfully:", { deviceId, activityId, activityName })
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
