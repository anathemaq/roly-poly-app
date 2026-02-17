import { NextResponse } from "next/server"
import { redis, KEYS, TTL } from "@/lib/redis"

export async function POST(request: Request) {
  try {
    const { deviceId, subscription } = await request.json()

    if (!deviceId || !subscription) {
      return NextResponse.json(
        { error: "deviceId and subscription are required" },
        { status: 400 }
      )
    }

    // Save push subscription to Redis with 30-day TTL
    await redis.set(KEYS.subscription(deviceId), JSON.stringify(subscription), {
      ex: TTL.subscription,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Push subscribe error:", error)
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    )
  }
}
