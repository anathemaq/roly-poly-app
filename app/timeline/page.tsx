"use client"

import { useEffect, useState, useRef, useCallback, memo } from "react"
import { useDay } from "@/lib/day-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Calendar, Clock, Undo2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { Activity } from "@/lib/types"

// --- Constants ---
const PX_PER_HOUR = 100
const PX_PER_MINUTE = PX_PER_HOUR / 60
const TOTAL_HEIGHT = 24 * PX_PER_HOUR
const SNAP_MINUTES = 5
const MIN_DURATION = 5

// --- Pure helpers (no React) ---
function minutesToPx(minutes: number) {
  return minutes * PX_PER_MINUTE
}

function pxToMinutes(px: number) {
  return Math.round(px / PX_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES
}

function activityTopPx(a: Activity) {
  if (!a.startTime) return 0
  return a.startTime.getHours() * PX_PER_HOUR + a.startTime.getMinutes() * PX_PER_MINUTE
}

function activityHeightPx(a: Activity) {
  return Math.max(30, minutesToPx(a.duration))
}

function formatTime(date?: Date) {
  if (!date || isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}м`
  if (m === 0) return `${h}ч`
  return `${h}ч ${m}м`
}

function getClientY(e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent): number {
  if ("touches" in e && e.touches.length > 0) return e.touches[0].clientY
  if ("changedTouches" in e && e.changedTouches.length > 0) return e.changedTouches[0].clientY
  return (e as MouseEvent).clientY
}

// --- Activity Block (memoized) ---
interface ActivityBlockProps {
  activity: Activity
  isSelected: boolean
  onSelect: (id: string) => void
  onDragStart: (id: string, e: React.PointerEvent) => void
  onResizeStart: (id: string, edge: "top" | "bottom", e: React.PointerEvent) => void
}

const ActivityBlock = memo(function ActivityBlock({
  activity,
  isSelected,
  onSelect,
  onDragStart,
  onResizeStart,
}: ActivityBlockProps) {
  const top = activityTopPx(activity)
  const height = activityHeightPx(activity)
  const isCompact = activity.duration < 60 && height >= 15
  const showTime = height >= 25
  const showDuration = height >= 35
  const showName = height >= 15

  return (
    <div
      className="absolute left-1 right-1 z-10"
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <Card
        className={cn(
          "h-full relative overflow-visible touch-none select-none",
          "transition-shadow duration-150",
          isSelected && "ring-2 ring-primary shadow-lg",
        )}
        onClick={() => onSelect(activity.id)}
      >
        <div className="p-1 h-full flex flex-col justify-center overflow-hidden">
          {isCompact ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-foreground truncate flex-1">
                {activity.name}
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatTime(activity.startTime)}-{formatTime(activity.endTime)}
              </span>
              <span className="text-[10px] font-medium text-primary whitespace-nowrap ml-1">
                {formatDuration(activity.duration)}
              </span>
            </div>
          ) : (
            <>
              {showName && (
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs font-medium text-foreground truncate">
                    {activity.name}
                  </span>
                </div>
              )}
              {showTime && (
                <div className="text-[10px] text-muted-foreground truncate">
                  {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                </div>
              )}
              {showDuration && (
                <div className="text-[10px] font-medium text-primary truncate">
                  {formatDuration(activity.duration)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Drag handle -- center area */}
        <div
          className="absolute inset-x-0 top-4 bottom-4 cursor-grab active:cursor-grabbing z-10"
          onPointerDown={(e) => onDragStart(activity.id, e)}
        />

        {/* Resize: top */}
        <div
          className="absolute top-0 left-0 right-0 h-4 cursor-ns-resize z-20 hover:bg-primary/10"
          onPointerDown={(e) => onResizeStart(activity.id, "top", e)}
        />
        {/* Resize: bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize z-20 hover:bg-primary/10"
          onPointerDown={(e) => onResizeStart(activity.id, "bottom", e)}
        />
      </Card>
    </div>
  )
})

// --- Time Scale (static, memoized) ---
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const TimeScale = memo(function TimeScale() {
  return (
    <div className="w-12 bg-muted/30 border-r border-border flex-shrink-0">
      <div className="relative" style={{ height: `${TOTAL_HEIGHT}px` }}>
        {HOURS.map((hour) => (
          <div key={hour} className="absolute w-full" style={{ top: `${hour * PX_PER_HOUR}px` }}>
            <div className="flex items-center h-6 px-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                {hour.toString().padStart(2, "0")}:00
              </span>
            </div>
            {[15, 30, 45].map((minute) => (
              <div
                key={minute}
                className="absolute w-1.5 h-px bg-border"
                style={{ top: `${minutesToPx(minute)}px`, left: "9px" }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
})

// --- Current Time Indicator ---
function CurrentTimeIndicator() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  const top = now.getHours() * PX_PER_HOUR + now.getMinutes() * PX_PER_MINUTE

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <div className="flex-1 h-0.5 bg-primary" />
        <span className="text-xs font-medium text-primary ml-2 bg-background px-1 rounded">
          {formatTime(now)}
        </span>
      </div>
    </div>
  )
}

// --- Activity Detail Popup ---
interface ActivityPopupProps {
  activity: Activity
  onClose: () => void
  onUpdate: (id: string, changes: Partial<Activity>) => void
}

function ActivityPopup({ activity, onClose, onUpdate }: ActivityPopupProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Card className="max-w-md w-full p-6 bg-background">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">{activity.name}</h3>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Начало:</span>
              <input
                type="time"
                value={activity.startTime ? activity.startTime.toTimeString().slice(0, 5) : ""}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(":").map(Number)
                  const newStart = new Date(activity.startTime!)
                  newStart.setHours(hours, minutes, 0, 0)
                  onUpdate(activity.id, { startTime: newStart })
                }}
                className="px-2 py-1 border border-border rounded text-sm bg-background text-foreground"
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Длительность:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() =>
                    onUpdate(activity.id, {
                      duration: Math.max(MIN_DURATION, activity.duration - SNAP_MINUTES),
                    })
                  }
                >
                  -
                </Button>
                <span className="text-sm font-medium w-16 text-center text-foreground">
                  {formatDuration(activity.duration)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() =>
                    onUpdate(activity.id, { duration: activity.duration + SNAP_MINUTES })
                  }
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Окончание:</span>
              <span className="text-foreground">{formatTime(activity.endTime)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// --- Main Timeline ---
export default function TimelineScreen() {
  const { currentActivities, updateActivity, reorderActivities } = useDay()
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // --- Undo ---
  const [undoStack, setUndoStack] = useState<Activity[][]>([])
  const saveSnapshot = useCallback(() => {
    const snapshot = currentActivities.map((a) => ({
      ...a,
      startTime: a.startTime ? new Date(a.startTime.getTime()) : undefined,
      endTime: a.endTime ? new Date(a.endTime.getTime()) : undefined,
    }))
    setUndoStack((prev) => [...prev.slice(-19), snapshot])
  }, [currentActivities])

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    reorderActivities(prev)
  }, [undoStack, reorderActivities])

  // --- Drag / Resize via PointerEvents (ref-based, no re-renders during gesture) ---
  const gestureRef = useRef<{
    type: "drag" | "resize"
    activityId: string
    edge?: "top" | "bottom"
    offsetY: number
    pointerId: number
  } | null>(null)

  const onGesturePointerMove = useCallback(
    (e: PointerEvent) => {
      const g = gestureRef.current
      if (!g || !timelineRef.current) return
      e.preventDefault()

      const activity = currentActivities.find((a) => a.id === g.activityId)
      if (!activity || !activity.startTime) return

      const rect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const relY = e.clientY - rect.top + scrollTop

      if (g.type === "drag") {
        const targetTopPx = relY - g.offsetY
        let newStartMin = pxToMinutes(targetTopPx)
        newStartMin = Math.max(0, Math.min(24 * 60 - activity.duration, newStartMin))

        const newStart = new Date(activity.startTime)
        newStart.setHours(0, 0, 0, 0)
        newStart.setMinutes(newStartMin, 0, 0)
        updateActivity(activity.id, { startTime: newStart })
      } else if (g.type === "resize") {
        const currentTop = activityTopPx(activity)

        if (g.edge === "bottom") {
          const newHeightPx = relY - g.offsetY - currentTop
          const newDuration = Math.max(MIN_DURATION, pxToMinutes(newHeightPx))
          updateActivity(activity.id, { duration: newDuration })
        } else {
          // Top edge: move start, keep end fixed
          const endMin =
            activity.startTime.getHours() * 60 +
            activity.startTime.getMinutes() +
            activity.duration
          let newStartMin = pxToMinutes(relY - g.offsetY)
          newStartMin = Math.max(0, Math.min(endMin - MIN_DURATION, newStartMin))
          const newDuration = endMin - newStartMin

          const newStart = new Date(activity.startTime)
          newStart.setHours(0, 0, 0, 0)
          newStart.setMinutes(newStartMin, 0, 0)
          updateActivity(activity.id, { startTime: newStart, duration: newDuration })
        }
      }
    },
    [currentActivities, updateActivity],
  )

  const onGesturePointerUp = useCallback(
    (e: PointerEvent) => {
      gestureRef.current = null
      document.removeEventListener("pointermove", onGesturePointerMove)
      document.removeEventListener("pointerup", onGesturePointerUp)
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    },
    [onGesturePointerMove],
  )

  const startDrag = useCallback(
    (activityId: string, e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const activity = currentActivities.find((a) => a.id === activityId)
      if (!activity || !timelineRef.current) return
      saveSnapshot()

      const rect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const offsetY = e.clientY - rect.top + scrollTop - activityTopPx(activity)

      gestureRef.current = { type: "drag", activityId, offsetY, pointerId: e.pointerId }
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      document.addEventListener("pointermove", onGesturePointerMove)
      document.addEventListener("pointerup", onGesturePointerUp)
    },
    [currentActivities, saveSnapshot, onGesturePointerMove, onGesturePointerUp],
  )

  const startResize = useCallback(
    (activityId: string, edge: "top" | "bottom", e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const activity = currentActivities.find((a) => a.id === activityId)
      if (!activity || !timelineRef.current) return
      saveSnapshot()

      const rect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const top = activityTopPx(activity)
      const bottom = top + activityHeightPx(activity)
      const anchorPx = edge === "top" ? top : bottom
      const offsetY = e.clientY - rect.top + scrollTop - anchorPx

      gestureRef.current = { type: "resize", activityId, edge, offsetY, pointerId: e.pointerId }
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      document.addEventListener("pointermove", onGesturePointerMove)
      document.addEventListener("pointerup", onGesturePointerUp)
    },
    [currentActivities, saveSnapshot, onGesturePointerMove, onGesturePointerUp],
  )

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (currentActivities.length > 0 && timelineRef.current) {
      const now = new Date()
      const pos = now.getHours() * PX_PER_HOUR + now.getMinutes() * PX_PER_MINUTE
      timelineRef.current.scrollTo({ top: Math.max(0, pos - 200), behavior: "smooth" })
    }
  }, [currentActivities.length])

  const handleSelect = useCallback(
    (id: string) => setSelectedActivity((prev) => (prev === id ? null : id)),
    [],
  )

  // --- Empty state ---
  if (currentActivities.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 text-center space-y-4 max-w-md">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">День не начат</h2>
          <p className="text-muted-foreground">
            Вернитесь на главный экран и выберите шаблон дня
          </p>
          <Button onClick={() => router.push("/")} className="w-full">
            На главную
          </Button>
        </Card>
      </div>
    )
  }

  const selectedActivityData = selectedActivity
    ? currentActivities.find((a) => a.id === selectedActivity)
    : null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-3 flex justify-between items-center border-b border-border">
        <h1 className="text-base font-semibold text-foreground">Таймлайн</h1>
        <ThemeToggle />
      </header>

      {/* Timeline */}
      <main className="flex-1 overflow-y-auto" ref={timelineRef}>
        <div className="flex">
          <TimeScale />

          {/* Activities Track */}
          <div className="flex-1 relative" style={{ height: `${TOTAL_HEIGHT}px` }}>
            <CurrentTimeIndicator />

            {currentActivities.map((activity) => (
              <ActivityBlock
                key={activity.id}
                activity={activity}
                isSelected={selectedActivity === activity.id}
                onSelect={handleSelect}
                onDragStart={startDrag}
                onResizeStart={startResize}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Floating Undo */}
      {undoStack.length > 0 && (
        <button
          onClick={undo}
          className="fixed bottom-20 right-4 z-30 w-10 h-10 rounded-full bg-muted/80 backdrop-blur-sm border border-border shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Отменить"
        >
          <Undo2 className="h-4 w-4 text-foreground" />
        </button>
      )}

      {/* Activity Popup */}
      {selectedActivityData && (
        <ActivityPopup
          activity={selectedActivityData}
          onClose={() => setSelectedActivity(null)}
          onUpdate={updateActivity}
        />
      )}
    </div>
  )
}
