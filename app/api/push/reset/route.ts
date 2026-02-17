import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

// Temporary endpoint to clear stale push:queued and push:notified flags
// Call once: GET /api/push/reset
export async function GET() {
  try {
    const patterns = ["push:queued:*", "push:notified:*", "push:schedule:*"]
    let deleted = 0

    for (const pattern of patterns) {
      let cursor = 0
      do {
        const result = await redis.scan(cursor, { match: pattern, count: 100 })
        cursor = result[0] as number
        const keys = result[1] as string[]
        if (keys.length > 0) {
          for (const key of keys) {
            await redis.del(key)
            deleted++
          }
        }
      } while (cursor !== 0)
    }

    console.log("[v0] Redis push keys reset, deleted:", deleted)
    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    console.error("[v0] Redis reset error:", error)
    return NextResponse.json({ error: "Failed to reset" }, { status: 500 })
  }
}
