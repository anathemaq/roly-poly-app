import { Redis } from "@upstash/redis"

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  }
  return _redis
}

/** @deprecated Use getRedis() for lazy initialization */
export const redis = {
  get get() { return getRedis().get.bind(getRedis()) },
  get set() { return getRedis().set.bind(getRedis()) },
  get del() { return getRedis().del.bind(getRedis()) },
  get exists() { return getRedis().exists.bind(getRedis()) },
} as unknown as Redis

// Redis key patterns
export const KEYS = {
  subscription: (deviceId: string) => `push:sub:${deviceId}`,
  schedule: (deviceId: string) => `push:schedule:${deviceId}`,
  /** Active session id — only notifications with this sessionId should fire */
  activeSession: (deviceId: string) => `push:session:${deviceId}`,
  notified: (deviceId: string, activityId: string, endTime?: string) =>
    `push:notified:${deviceId}:${activityId}:${endTime || ""}`,
  queued: (deviceId: string, activityId: string, endTime?: string) =>
    `push:queued:${deviceId}:${activityId}:${endTime || ""}`,
} as const

// TTLs in seconds
export const TTL = {
  subscription: 30 * 24 * 60 * 60, // 30 days
  schedule: 24 * 60 * 60, // 24 hours
  notified: 24 * 60 * 60, // 24 hours
} as const
