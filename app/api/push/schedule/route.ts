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

    const now = new Date()
    const pending = activities.filter((a) => new Date(a.endTime) > now)

    console.log("[v0] Schedule request:", { deviceId, total: activities.length, pending: pending.length })

    if (pending.length === 0) {
      await redis.del(KEYS.schedule(deviceId))
      console.log("[v0] No pending activities, clearing schedule")
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

    console.log("[v0] Using baseUrl for QStash:", baseUrl)

    // Schedule a QStash message for each pending activity
    let scheduled = 0
    for (const activity of pending) {
      const notifiedKey = KEYS.notified(deviceId, activity.id)
      const alreadyNotified = await redis.exists(notifiedKey)
      if (alreadyNotified) {
        console.log("[v0] Already notified, skipping:", activity.id)
        continue
      }

      // Check if already scheduled (avoid duplicates)
      const scheduledKey = `push:queued:${deviceId}:${activity.id}`
      const alreadyScheduled = await redis.exists(scheduledKey)
      if (alreadyScheduled) {
        console.log("[v0] Already scheduled, skipping:", activity.id)
        continue
      }

      const endTime = new Date(activity.endTime)
      const delaySeconds = Math.max(
        0,
        Math.floor((endTime.getTime() - now.getTime()) / 1000)
      )

      try {
        const qstash = getQStashClient()
        const callbackUrl = `${baseUrl}/api/push/send`
        console.log("[v0] Publishing to QStash:", { callbackUrl, delaySeconds, activityId: activity.id })

        await qstash.publishJSON({
          url: callbackUrl,
          body: {
            deviceId,
            activityId: activity.id,
            activityName: activity.name,
          },
          delay: delaySeconds,
        })

        // Mark as queued with TTL matching the delay + buffer
        await redis.set(scheduledKey, "1", { ex: Math.max(delaySeconds + 300, TTL.schedule) })
        scheduled++
        console.log("[v0] QStash scheduled OK:", { activityId: activity.id, name: activity.name, delaySeconds })
      } catch (err) {
        console.error(`[v0] Failed to schedule QStash for ${activity.id}:`, err)
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
