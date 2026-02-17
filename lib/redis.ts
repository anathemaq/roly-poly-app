import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Redis key patterns
export const KEYS = {
  subscription: (deviceId: string) => `push:sub:${deviceId}`,
  schedule: (deviceId: string) => `push:schedule:${deviceId}`,
  notified: (deviceId: string, activityId: string) =>
    `push:notified:${deviceId}:${activityId}`,
} as const

// TTLs in seconds
export const TTL = {
  subscription: 30 * 24 * 60 * 60, // 30 days
  schedule: 24 * 60 * 60, // 24 hours
  notified: 24 * 60 * 60, // 24 hours
} as const
