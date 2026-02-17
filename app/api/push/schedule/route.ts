import { NextResponse } from "next/server"
import { redis, KEYS, TTL } from "@/lib/redis"

interface ScheduledActivity {
  id: string
  name: string
  endTime: string // ISO string
}

export async function POST(request: Request) {
  try {
    const { deviceId, activities } = (await request.json()) as {
      deviceId: string
      activities: ScheduledActivity[]
    }

    if (!deviceId || !activities) {
      return NextResponse.json(
        { error: "deviceId and activities are required" },
        { status: 400 }
      )
    }

    // Save only incomplete activities with future endTimes
    const now = new Date()
    const pending = activities.filter(
      (a) => new Date(a.endTime) > now
    )

    if (pending.length === 0) {
      // No pending activities — clean up schedule
      await redis.del(KEYS.schedule(deviceId))
      return NextResponse.json({ success: true, scheduled: 0 })
    }

    await redis.set(KEYS.schedule(deviceId), JSON.stringify(pending), {
      ex: TTL.schedule,
    })

    return NextResponse.json({ success: true, scheduled: pending.length })
  } catch (error) {
    console.error("Push schedule error:", error)
    return NextResponse.json(
      { error: "Failed to save schedule" },
      { status: 500 }
    )
  }
}
