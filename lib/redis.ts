import { Redis } from "@upstash/redis"

let _redis: Redis | null = null

function isRedisConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

export function getRedis(): Redis | null {
  if (!isRedisConfigured()) return null
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  }
  return _redis
}

// No-op fallback that silently skips when Redis is not configured (e.g. preview)
const noop = (..._args: unknown[]) => Promise.resolve(null)
const noopExists = (..._args: unknown[]) => Promise.resolve(0)

export const redis = {
  get get() { const r = getRedis(); return r ? r.get.bind(r) : noop },
  get set() { const r = getRedis(); return r ? r.set.bind(r) : noop },
  get del() { const r = getRedis(); return r ? r.del.bind(r) : noop },
  get exists() { const r = getRedis(); return r ? r.exists.bind(r) : noopExists },
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
