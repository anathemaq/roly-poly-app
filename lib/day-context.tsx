"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react"
import { type Activity, type DayTemplate, DEFAULT_TEMPLATES } from "./types"
import { getDeviceId } from "./device-id"

type TimerPreset = {
  work: number
  break: number
  label: string
}

type TimerPhase = "work" | "break"

interface DayContextType {
  currentActivities: Activity[]
  templates: DayTemplate[]
  currentTemplate: DayTemplate | null
  isHydrated: boolean
  startDay: (template: DayTemplate) => void
  updateActivity: (id: string, updates: Partial<Activity>) => void
  reorderActivities: (activities: Activity[]) => void
  getCurrentActivity: () => Activity | null
  skipActivity: (id: string) => void
  pauseSchedule: () => void
  resumeSchedule: () => void
  addTemplate: (template: DayTemplate) => void
  updateTemplate: (id: string, template: DayTemplate) => void
  deleteTemplate: (id: string) => void
  // Pomodoro timer
  pomodoroPreset: TimerPreset
  pomodoroPhase: TimerPhase
  pomodoroTimeRemaining: number
  pomodoroIsRunning: boolean
  pomodoroCompletedSessions: number
  setPomodoroPreset: (preset: TimerPreset) => void
  startPomodoro: () => void
  pausePomodoro: () => void
  resetPomodoro: () => void
  skipPomodoroPhase: () => void
  setPomodoroTimeRemaining: (seconds: number) => void
}

// --- localStorage helpers ---
const STORAGE_KEYS = {
  templates: "roly-poly-templates",
  activities: "roly-poly-activities",
  currentTemplate: "roly-poly-current-template",
  pomodoroSessions: "roly-poly-pomodoro-sessions",
  pomodoroSessionsDate: "roly-poly-pomodoro-sessions-date",
} as const

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch { /* quota exceeded or unavailable */ }
}

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function hydrateActivities(activities: Activity[]): Activity[] {
  return activities.map((a) => ({
    ...a,
    startTime: a.startTime ? new Date(a.startTime) : undefined,
    endTime: a.endTime ? new Date(a.endTime) : undefined,
  }))
}

// --- Notification helpers ---
function requestNotificationPermission() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission()
  }
}

function sendNotification(title: string, body: string) {
  // Try Service Worker notification first (works on iOS PWA)
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: "/icons/icon-144x144.png",
        badge: "/icons/icon-96x96.png",
        vibrate: [200, 100, 200],
        tag: "roly-poly-" + Date.now(),
      }).catch(() => {
        // Fallback to regular Notification API
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, icon: "/icons/icon-144x144.png" })
        }
      })
    }).catch(() => {})
  } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icons/icon-144x144.png" })
  }
  // Vibration
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([200, 100, 200])
  }
  // Sound
  try {
    const audio = new Audio("/notification.mp3")
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch { /* no audio support */ }
}

const DayContext = createContext<DayContextType | undefined>(undefined)

export const POMODORO_PRESETS: TimerPreset[] = [
  { work: 25, break: 5, label: "25/5" },
  { work: 50, break: 10, label: "50/10" },
  { work: 90, break: 15, label: "90/15" },
]

export function DayProvider({ children }: { children: ReactNode }) {
  const [currentActivities, setCurrentActivities] = useState<Activity[]>([])
  const [templates, setTemplates] = useState<DayTemplate[]>(DEFAULT_TEMPLATES)
  const [currentTemplate, setCurrentTemplate] = useState<DayTemplate | null>(null)
  const [pausedAt, setPausedAt] = useState<Date | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  const [pomodoroPreset, setPomodoroPresetState] = useState<TimerPreset>(POMODORO_PRESETS[0])
  const [pomodoroPhase, setPomodoroPhase] = useState<TimerPhase>("work")
  const [pomodoroTimeRemaining, setPomodoroTimeRemaining] = useState(pomodoroPreset.work * 60)
  const [pomodoroIsRunning, setPomodoroIsRunning] = useState(false)
  const [pomodoroCompletedSessions, setPomodoroCompletedSessions] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pomodoroPhaseRef = useRef<TimerPhase>(pomodoroPhase)
  const pomodoroPresetRef = useRef<TimerPreset>(pomodoroPreset)

  // Keep refs in sync
  pomodoroPhaseRef.current = pomodoroPhase
  pomodoroPresetRef.current = pomodoroPreset

  // --- Hydration: load from localStorage on mount ---
  useEffect(() => {
    const savedTemplates = loadFromStorage<DayTemplate[]>(STORAGE_KEYS.templates)
    if (savedTemplates && savedTemplates.length > 0) {
      setTemplates(savedTemplates)
    }

    const savedActivities = loadFromStorage<Activity[]>(STORAGE_KEYS.activities)
    if (savedActivities && savedActivities.length > 0) {
      setCurrentActivities(hydrateActivities(savedActivities))
    }

    const savedCurrentTemplate = loadFromStorage<DayTemplate>(STORAGE_KEYS.currentTemplate)
    if (savedCurrentTemplate) {
      setCurrentTemplate(savedCurrentTemplate)
    }

    // Pomodoro sessions — reset if it's a different day
    const savedDate = loadFromStorage<string>(STORAGE_KEYS.pomodoroSessionsDate)
    const today = new Date().toDateString()
    if (savedDate === today) {
      const savedSessions = loadFromStorage<number>(STORAGE_KEYS.pomodoroSessions)
      if (savedSessions !== null) {
        setPomodoroCompletedSessions(savedSessions)
      }
    }

    setIsHydrated(true)
  }, [])

  // --- Persist templates ---
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.templates, templates)
  }, [templates, isHydrated])

  // --- Persist activities + currentTemplate ---
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.activities, currentActivities)
  }, [currentActivities, isHydrated])

  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.currentTemplate, currentTemplate)
  }, [currentTemplate, isHydrated])

  // --- Persist pomodoro sessions ---
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.pomodoroSessions, pomodoroCompletedSessions)
    saveToStorage(STORAGE_KEYS.pomodoroSessionsDate, new Date().toDateString())
  }, [pomodoroCompletedSessions, isHydrated])

  // --- Sync activities to server for push notifications (debounced) ---
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!isHydrated) return

    // Clear previous pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    // Debounce: wait 2s after last change before syncing
    syncTimeoutRef.current = setTimeout(() => {
      const pendingActivities = currentActivities.filter(
        (a) => !a.completed && a.endTime && new Date(a.endTime) > new Date()
      )

      const deviceId = getDeviceId()
      if (!deviceId) return

      const payload = {
        deviceId,
        activities: pendingActivities.map((a) => ({
          id: a.id,
          name: a.name,
          endTime: a.endTime!.toISOString(),
        })),
      }

      fetch("/api/push/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently fail — client-side notifications still work as fallback
      })
    }, 2000)

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [currentActivities, isHydrated])

  // --- Activity completion notification + auto-complete ---
  const notifiedActivitiesRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (currentActivities.length === 0) return

    const check = () => {
      const now = new Date()
      const expiredIds: string[] = []

      currentActivities.forEach((activity) => {
        if (
          !activity.completed &&
          activity.endTime &&
          now >= activity.endTime &&
          !notifiedActivitiesRef.current.has(activity.id)
        ) {
          notifiedActivitiesRef.current.add(activity.id)
          expiredIds.push(activity.id)
          sendNotification(
            "Время ��ышло!",
            `Активность "${activity.name}" завершена`
          )
        }
      })

      // Auto-mark expired activities as completed
      if (expiredIds.length > 0) {
        setCurrentActivities((prev) => {
          const updated = [...prev]
          let changed = false

          for (const id of expiredIds) {
            const idx = updated.findIndex((a) => a.id === id)
            if (idx !== -1 && !updated[idx].completed) {
              updated[idx] = { ...updated[idx], completed: true }
              changed = true
            }
          }

          if (!changed) return prev

          // Recalculate start/end times for remaining incomplete activities
          const now = new Date()
          let nextStart = now
          for (let i = 0; i < updated.length; i++) {
            if (updated[i].completed) continue
            updated[i] = {
              ...updated[i],
              startTime: new Date(nextStart),
              endTime: new Date(nextStart.getTime() + updated[i].duration * 60000),
            }
            nextStart = updated[i].endTime!
          }

          return updated
        })
      }
    }

    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [currentActivities])

  // --- Pomodoro timer ---
  const handlePomodoroPhaseComplete = useCallback(() => {
    setPomodoroIsRunning(false)
    const phase = pomodoroPhaseRef.current
    const preset = pomodoroPresetRef.current
    if (phase === "work") {
      setPomodoroCompletedSessions((prev) => prev + 1)
      setPomodoroPhase("break")
      setPomodoroTimeRemaining(preset.break * 60)
      sendNotification("Перерыв!", "Рабочая сессия завершена. Время отдохнуть.")
    } else {
      setPomodoroPhase("work")
      setPomodoroTimeRemaining(preset.work * 60)
      sendNotification("За работу!", "Перерыв окончен. Время сфокусироваться.")
    }
  }, [])

  useEffect(() => {
    if (pomodoroIsRunning && pomodoroTimeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setPomodoroTimeRemaining((prev) => {
          if (prev <= 1) {
            handlePomodoroPhaseComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [pomodoroIsRunning, pomodoroTimeRemaining, handlePomodoroPhaseComplete])

  const setPomodoroPreset = (preset: TimerPreset) => {
    setPomodoroPresetState(preset)
    setPomodoroIsRunning(false)
    setPomodoroPhase("work")
    setPomodoroTimeRemaining(preset.work * 60)
  }

  const startPomodoro = () => {
    requestNotificationPermission()
    setPomodoroIsRunning(true)
  }

  const pausePomodoro = () => {
    setPomodoroIsRunning(false)
  }

  const resetPomodoro = () => {
    setPomodoroIsRunning(false)
    setPomodoroPhase("work")
    setPomodoroTimeRemaining(pomodoroPreset.work * 60)
  }

  const skipPomodoroPhase = () => {
    handlePomodoroPhaseComplete()
  }

  const startDay = (template: DayTemplate) => {
    requestNotificationPermission()
    const now = new Date()
    let currentTime = new Date(now)

    const activities: Activity[] = template.activities.map((activity) => {
      const startTime = new Date(currentTime)
      const endTime = new Date(currentTime.getTime() + activity.duration * 60000)
      currentTime = endTime

      return {
        ...activity,
        startTime,
        endTime,
        completed: false,
      }
    })

    notifiedActivitiesRef.current.clear()
    setCurrentActivities(activities)
    setCurrentTemplate(template)
  }

  const updateActivity = (id: string, updates: Partial<Activity>) => {
    setCurrentActivities((prev) => {
      const index = prev.findIndex((a) => a.id === id)
      if (index === -1) return prev

      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }

        if (updates.completed === true) {
          // Recalculate: next incomplete activity starts from now, cascade the rest
          const now = new Date()
          let nextStart = now
          for (let i = index + 1; i < updated.length; i++) {
            if (updated[i].completed) continue
            updated[i].startTime = new Date(nextStart)
            updated[i].endTime = new Date(nextStart.getTime() + updated[i].duration * 60000)
            nextStart = updated[i].endTime!
          }
        }

        if (updates.completed === false) {
          let startTime = new Date()
          for (let i = index - 1; i >= 0; i--) {
            if (!updated[i].completed && updated[i].endTime) {
              startTime = updated[i].endTime
              break
            }
          }

          updated[index].startTime = startTime
          updated[index].endTime = new Date(startTime.getTime() + updated[index].duration * 60000)

          for (let i = index + 1; i < updated.length; i++) {
            const prevActivity = updated[i - 1]
            updated[i].startTime = prevActivity.endTime
            updated[i].endTime = new Date(prevActivity.endTime!.getTime() + updated[i].duration * 60000)
          }
        }

      if (updates.duration !== undefined || updates.startTime !== undefined) {
        const startTime = updates.startTime || updated[index].startTime!
        updated[index].startTime = startTime
        updated[index].endTime = new Date(startTime.getTime() + updated[index].duration * 60000)

        for (let i = index + 1; i < updated.length; i++) {
          const prevActivity = updated[i - 1]
          updated[i].startTime = prevActivity.endTime
          updated[i].endTime = new Date(prevActivity.endTime!.getTime() + updated[i].duration * 60000)
        }
      }

      return updated
    })
  }

  const reorderActivities = (activities: Activity[]) => {
    const now = new Date()
    const firstIncompleteIndex = activities.findIndex((a) => !a.completed)

    if (firstIncompleteIndex === -1) {
      setCurrentActivities(activities.map((a, i) => ({ ...a, order: i })))
      return
    }

    let currentTime = now

    const reordered = activities.map((activity, index) => {
      if (activity.completed) {
        return { ...activity, order: index }
      }

      const startTime = new Date(currentTime)
      const endTime = new Date(currentTime.getTime() + activity.duration * 60000)
      currentTime = endTime

      return {
        ...activity,
        startTime,
        endTime,
        order: index,
      }
    })

    setCurrentActivities(reordered)
  }

  const getCurrentActivity = () => {
    const now = new Date()
    const timeBasedActivity = currentActivities.find(
      (activity) =>
        !activity.completed &&
        activity.startTime &&
        activity.endTime &&
        now >= activity.startTime &&
        now < activity.endTime,
    )

    if (timeBasedActivity) return timeBasedActivity

    return currentActivities.find((activity) => !activity.completed) || null
  }

  const skipActivity = (id: string) => {
    setCurrentActivities((prev) => {
      const index = prev.findIndex((a) => a.id === id)
      if (index === -1) return prev

      const updated = [...prev]
      updated[index].completed = true

      const now = new Date()
      for (let i = index + 1; i < updated.length; i++) {
        const prevEndTime = i === index + 1 ? now : updated[i - 1].endTime!
        updated[i].startTime = prevEndTime
        updated[i].endTime = new Date(prevEndTime.getTime() + updated[i].duration * 60000)
      }

      return updated
    })
  }

  const pauseSchedule = () => {
    setPausedAt(new Date())
  }

  const resumeSchedule = () => {
    if (!pausedAt) return

    const pauseDuration = new Date().getTime() - pausedAt.getTime()

    setCurrentActivities((prev) => {
      return prev.map((activity) => {
        if (activity.startTime && activity.endTime) {
          return {
            ...activity,
            startTime: new Date(activity.startTime.getTime() + pauseDuration),
            endTime: new Date(activity.endTime.getTime() + pauseDuration),
          }
        }
        return activity
      })
    })

    setPausedAt(null)
  }

  const addTemplate = (template: DayTemplate) => {
    setTemplates((prev) => [...prev, template])
  }

  const updateTemplate = (id: string, template: DayTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? template : t)))
  }

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <DayContext.Provider
      value={{
        currentActivities,
        templates,
        currentTemplate,
        isHydrated,
        startDay,
        updateActivity,
        reorderActivities,
        getCurrentActivity,
        skipActivity,
        pauseSchedule,
        resumeSchedule,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        pomodoroPreset,
        pomodoroPhase,
        pomodoroTimeRemaining,
        pomodoroIsRunning,
        pomodoroCompletedSessions,
        setPomodoroPreset,
        startPomodoro,
        pausePomodoro,
        resetPomodoro,
        skipPomodoroPhase,
        setPomodoroTimeRemaining,
      }}
    >
      {children}
    </DayContext.Provider>
  )
}

export function useDay() {
  const context = useContext(DayContext)
  if (context === undefined) {
    throw new Error("useDay must be used within a DayProvider")
  }
  return context
}
