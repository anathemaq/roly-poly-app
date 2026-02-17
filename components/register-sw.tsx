"use client"

import { useEffect, useCallback } from "react"
import { getDeviceId } from "@/lib/device-id"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) return null

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription()
  if (subscription) return subscription

  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    // Send subscription to server with deviceId
    const deviceId = getDeviceId()
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, subscription: subscription.toJSON() }),
    })

    return subscription
  } catch (err) {
    console.error("Push subscription failed:", err)
    return null
  }
}

export function RegisterSW() {
  const setup = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return

    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready

      // Request notification permission if not yet decided
      if (Notification.permission === "default") {
        await Notification.requestPermission()
      }

      if (Notification.permission === "granted") {
        await subscribeToPush(registration)
      }
    } catch {
      // SW registration failed
    }
  }, [])

  useEffect(() => {
    setup()
  }, [setup])

  return null
}
