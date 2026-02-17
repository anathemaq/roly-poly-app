const STORAGE_KEY = "roly-poly-device-id"

export function getDeviceId(): string {
  if (typeof window === "undefined") return ""

  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
