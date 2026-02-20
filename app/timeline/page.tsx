"use client"

import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react"
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
const MIN_BLOCK_HEIGHT = 36 // minimum visual height for any block

// --- Pure helpers ---
function minutesToPx(minutes: number) {
  return minutes * PX_PER_MINUTE
}

function pxToMinutes(px: number) {
  return Math.round(px / PX_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES
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

// Compute visual layout: top/height for each activity, preventing overlaps.
// Always starts from 00:00 but extends beyond 24:00 if activities cross midnight.
function computeLayout(activities: Activity[]): {
  layout: Map<string, { top: number; height: number }>
  totalHeight: number
  totalHours: number
} {
  const layout = new Map<string, { top: number; height: number }>()

  // Find the first activity's calendar day to detect midnight crossings
  const firstActivity = activities.find((a) => a.startTime)
  const dayStartDate = firstActivity?.startTime
    ? new Date(firstActivity.startTime.getFullYear(), firstActivity.startTime.getMonth(), firstActivity.startTime.getDate())
    : new Date()

  let maxBottom = 0

  for (const a of activities) {
    if (!a.startTime) continue
    // Minutes since midnight of the calendar day
    const minutesSinceMidnight = (a.startTime.getTime() - dayStartDate.getTime()) / 60000
    const naturalTop = minutesSinceMidnight * PX_PER_MINUTE
    const naturalHeight = minutesToPx(a.duration)
    const visualHeight = Math.max(MIN_BLOCK_HEIGHT, naturalHeight)

    const top = Math.max(naturalTop, maxBottom)
    layout.set(a.id, { top, height: visualHeight })
    maxBottom = top + visualHeight + 10
  }

  // Extend beyond 24h if activities cross midnight
  const lastActivity = [...activities].reverse().find((a) => a.endTime)
  let totalHours = 24
  if (lastActivity?.endTime) {
    const minutesSinceMidnight = (lastActivity.endTime.getTime() - dayStartDate.getTime()) / 60000
    totalHours = Math.max(24, Math.ceil(minutesSinceMidnight / 60))
  }

  const totalHeight = Math.max(totalHours * PX_PER_HOUR, maxBottom + 20)

  return { layout, totalHeight, totalHours }
}

// --- Activity Block (memoized) ---
interface ActivityBlockProps {
  activity: Activity
  top: number
  height: number
  isSelected: boolean
  isDragTarget: boolean // visual indicator for drop target
  onSelect: (id: string) => void
  onDragStart: (id: string, e: React.PointerEvent) => void
  onResizeStart: (id: string, edge: "top" | "bottom", e: React.PointerEvent) => void
}

const ActivityBlock = memo(function ActivityBlock({
  activity,
  top,
  height,
  isSelected,
  isDragTarget,
  isResizing,
  isDragging,
  onSelect,
  onDragStart,
  onResizeStart,
}: ActivityBlockProps & { isResizing?: boolean; isDragging?: boolean }) {
  return (
    <div
      className="absolute left-1 right-1"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        zIndex: isResizing ? 30 : 10,
        opacity: isDragging ? 0.25 : 1,
      }}
    >
      {/* Drop indicator line above block */}
      {isDragTarget && (
        <div className="absolute -top-1.5 left-0 right-0 h-1 bg-primary rounded-full z-30 shadow-sm shadow-primary/40" />
      )}

      {/* Floating label: only for ultra-tiny blocks (<18px) */}
      {height < 18 && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{ bottom: `${height + 2}px`, zIndex: 35 }}
        >
          <div className="flex items-center justify-center">
            <span className="text-[10px] font-medium text-primary bg-background/90 backdrop-blur-sm border border-border rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap">
              {activity.name} &middot; {formatDuration(activity.duration)}
            </span>
          </div>
        </div>
      )}

      {/* Bottom resize handle -- visible only when selected */}
      {isSelected && (
        <div
          className="absolute -bottom-3 left-0 right-0 h-6 cursor-ns-resize flex items-center justify-center touch-none"
          style={{ zIndex: 35 }}
          onPointerDown={(e) => onResizeStart(activity.id, "bottom", e)}
        >
          <div className="w-10 h-1 rounded-full bg-primary/50" />
        </div>
      )}

      {/* Top resize handle -- visible only when selected */}
      {isSelected && (
        <div
          className="absolute -top-3 left-0 right-0 h-6 cursor-ns-resize flex items-center justify-center touch-none"
          style={{ zIndex: 35 }}
          onPointerDown={(e) => onResizeStart(activity.id, "top", e)}
        >
          <div className="w-10 h-1 rounded-full bg-primary/50" />
        </div>
      )}

      <Card
        className={cn(
          "h-full relative overflow-hidden select-none p-0 gap-0",
          isSelected && "ring-2 ring-primary shadow-lg",
        )}
        onClick={() => onSelect(activity.id)}
      >
        <div className="px-2 h-full flex flex-col justify-center overflow-hidden">
          {height < 18 ? (
            /* Ultra-tiny (<~10min): colored bar only */
            <div className="w-full h-1 bg-primary/50 rounded-full" />
          ) : height < 32 ? (
            /* Tiny (10-18min): single line -- name + duration */
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-medium text-foreground truncate flex-1 leading-none">
                {activity.name}
              </span>
              <span className="text-[9px] text-primary whitespace-nowrap leading-none">
                {formatDuration(activity.duration)}
              </span>
            </div>
          ) : height < 48 ? (
            /* Short (20-28min): single line slightly bigger */
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-foreground truncate flex-1 leading-none">
                {activity.name}
              </span>
              <span className="text-[10px] font-medium text-primary whitespace-nowrap leading-none">
                {formatDuration(activity.duration)}
              </span>
            </div>
          ) : height < 65 ? (
            /* Medium (30-38min): name on top, time + duration below */
            <>
              <span className="text-[11px] font-medium text-foreground truncate leading-tight">
                {activity.name}
              </span>
              <span className="text-[10px] text-muted-foreground truncate leading-tight">
                {formatTime(activity.startTime)} - {formatTime(activity.endTime)} · {formatDuration(activity.duration)}
              </span>
            </>
          ) : (
            /* Full (40min+): name + time + duration comfortably */
            <>
              <span className="text-xs font-medium text-foreground truncate leading-snug">
                {activity.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                </span>
                <span className="text-[10px] font-medium text-primary">
                  {formatDuration(activity.duration)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Drag handle -- center area, does NOT preventDefault to allow scroll */}
        <div
          className="absolute inset-x-0 top-0 bottom-0 cursor-grab active:cursor-grabbing z-10"
          onPointerDown={(e) => onDragStart(activity.id, e)}
        />
      </Card>
    </div>
  )
})

// --- Time Scale (dynamic, memoized) ---
const TimeScale = memo(function TimeScale({
  height,
  totalHours,
}: {
  height: number
  totalHours: number
}) {
  const hours = useMemo(
    () => Array.from({ length: totalHours + 1 }, (_, i) => i),
    [totalHours],
  )

  return (
    <div className="w-12 bg-muted/30 border-r border-border flex-shrink-0">
      <div className="relative" style={{ height: `${height}px` }}>
        {hours.map((hour) => {
          const displayHour = hour % 24
          const isNextDay = hour >= 24

          return (
            <div key={hour} className="absolute w-full" style={{ top: `${hour * PX_PER_HOUR}px` }}>
              <div className="flex items-center h-6 px-1">
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isNextDay ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {displayHour.toString().padStart(2, "0")}:00
                  {isNextDay && <span className="text-[8px] ml-0.5 opacity-70">+1</span>}
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
          )
        })}
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
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
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
              <span className="text-muted-foreground">��лительность:</span>
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
                  {"-"}
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
                  {"+"}
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

// --- Drag ghost overlay ---
interface DragGhostProps {
  activity: Activity
  topPx: number
  heightPx: number
}

function DragGhost({ activity, topPx, heightPx }: DragGhostProps) {
  return (
    <div
      className="absolute left-1 right-1 z-40 pointer-events-none opacity-60"
      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
    >
      <Card className="h-full ring-2 ring-primary shadow-xl bg-primary/10 p-0 gap-0">
        <div className="px-2 h-full flex items-center">
          <span className="text-xs font-medium text-foreground truncate">{activity.name}</span>
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

  // Layout computation: prevents short-block overlap
  const { layout, totalHeight: computedHeight, totalHours } = useMemo(
    () => computeLayout(currentActivities),
    [currentActivities],
  )

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

  // --- Resize active tracking ---
  const [resizingId, setResizingId] = useState<string | null>(null)

  // --- Drag state for reordering ---
  const [dragState, setDragState] = useState<{
    activityId: string
    ghostTop: number
    ghostHeight: number
    dropTargetId: string | null // id of the activity we'd insert BEFORE
  } | null>(null)

  // --- Gesture tracking ---
  const gestureRef = useRef<{
    type: "drag" | "resize"
    activityId: string
    edge?: "top" | "bottom"
    startY: number
    initialOffsetInBlock: number
    startTop: number
    startHeight: number
    pointerId: number
  } | null>(null)
  const autoScrollRef = useRef<number>(0)
  // Prevent popup from opening after a gesture (resize/drag)
  const gestureJustEndedRef = useRef(false)
  // Movement threshold: only commit to resize after moving > threshold px
  const gestureCommittedRef = useRef(false)
  const GESTURE_THRESHOLD = 10 // px -- prevents accidental resize on scroll
  // Long press timer for drag
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const LONG_PRESS_MS = 250

  // Find the drop target: which activity would the dragged block go before?
  const findDropTarget = useCallback(
    (dragId: string, ghostCenterY: number): string | null => {
      // Go through activities in order, find where the ghost center falls
      for (const a of currentActivities) {
        if (a.id === dragId) continue
        const l = layout.get(a.id)
        if (!l) continue
        const midpoint = l.top + l.height / 2
        if (ghostCenterY < midpoint) {
          return a.id // insert before this activity
        }
      }
      return null // insert at end
    },
    [currentActivities, layout],
  )

  const onGesturePointerMove = useCallback(
    (e: PointerEvent) => {
      const g = gestureRef.current
      if (!g || !timelineRef.current) return

      const rect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const relY = e.clientY - rect.top + scrollTop

      // Movement threshold: don't commit until finger moves enough
      if (!gestureCommittedRef.current) {
        const moved = Math.abs(relY - g.startY)
        if (moved < GESTURE_THRESHOLD) return // still within scroll tolerance
        gestureCommittedRef.current = true
      }

      e.preventDefault()

      if (g.type === "drag") {
        // Move the ghost
        const ghostTop = Math.max(0, relY - g.initialOffsetInBlock)
        const ghostHeight = g.startHeight
        const ghostCenter = ghostTop + ghostHeight / 2
        const dropTargetId = findDropTarget(g.activityId, ghostCenter)

        setDragState({
          activityId: g.activityId,
          ghostTop,
          ghostHeight,
          dropTargetId,
        })

        // Auto-scroll when pointer is near the viewport edges
        const EDGE_ZONE = 60 // px from edge to trigger scroll
        const SCROLL_SPEED = 8 // px per frame
        const pointerInViewport = e.clientY - rect.top
        const el = timelineRef.current!

        cancelAnimationFrame(autoScrollRef.current)

        if (pointerInViewport < EDGE_ZONE) {
          // Scroll up
          const tick = () => {
            el.scrollTop = Math.max(0, el.scrollTop - SCROLL_SPEED)
            autoScrollRef.current = requestAnimationFrame(tick)
          }
          autoScrollRef.current = requestAnimationFrame(tick)
        } else if (pointerInViewport > rect.height - EDGE_ZONE) {
          // Scroll down
          const tick = () => {
            el.scrollTop = Math.min(el.scrollHeight - el.clientHeight, el.scrollTop + SCROLL_SPEED)
            autoScrollRef.current = requestAnimationFrame(tick)
          }
          autoScrollRef.current = requestAnimationFrame(tick)
        }
      } else if (g.type === "resize") {
        const activity = currentActivities.find((a) => a.id === g.activityId)
        if (!activity || !activity.startTime) return

        if (g.edge === "bottom") {
          const currentTop = g.startTop
          const newHeightPx = relY - currentTop
          const newDuration = Math.max(MIN_DURATION, pxToMinutes(newHeightPx))
          updateActivity(activity.id, { duration: newDuration })
        } else {
          // Top edge: move start, keep end fixed
          const endMin =
            activity.startTime.getHours() * 60 +
            activity.startTime.getMinutes() +
            activity.duration
          let newStartMin = pxToMinutes(relY)
          newStartMin = Math.max(0, Math.min(endMin - MIN_DURATION, newStartMin))
          const newDuration = endMin - newStartMin

          const newStart = new Date(activity.startTime)
          newStart.setHours(0, 0, 0, 0)
          newStart.setMinutes(newStartMin, 0, 0)
          updateActivity(activity.id, { startTime: newStart, duration: newDuration })
        }
      }
    },
    [currentActivities, updateActivity, findDropTarget],
  )

  const onGesturePointerUp = useCallback(
    (e: PointerEvent) => {
      const g = gestureRef.current
      gestureRef.current = null

      cancelAnimationFrame(autoScrollRef.current)
      setResizingId(null)

      // If the gesture was committed (finger actually moved), suppress the next click
      if (gestureCommittedRef.current) {
        gestureJustEndedRef.current = true
        // Auto-reset after a short delay so future taps work normally
        setTimeout(() => { gestureJustEndedRef.current = false }, 300)
      }
      gestureCommittedRef.current = false

      document.removeEventListener("pointermove", onGesturePointerMove)
      document.removeEventListener("pointerup", onGesturePointerUp)

      if (g?.type === "drag" && dragState) {
        // Perform the reorder
        const { activityId, dropTargetId } = dragState
        setDragState(null)

        const draggedIdx = currentActivities.findIndex((a) => a.id === activityId)
        if (draggedIdx === -1) return

        const dragged = currentActivities[draggedIdx]
        const without = currentActivities.filter((a) => a.id !== activityId)

        let insertIdx: number
        if (dropTargetId === null) {
          // Insert at end
          insertIdx = without.length
        } else {
          insertIdx = without.findIndex((a) => a.id === dropTargetId)
          if (insertIdx === -1) insertIdx = without.length
        }

        const reordered = [...without.slice(0, insertIdx), dragged, ...without.slice(insertIdx)]

        // Recalculate times: first activity keeps its start, rest cascade
        const result: Activity[] = []
        let nextStart = reordered[0]?.startTime || new Date()

        for (let i = 0; i < reordered.length; i++) {
          const a = reordered[i]
          const startTime = i === 0 ? nextStart : new Date(nextStart)
          const endTime = new Date(startTime.getTime() + a.duration * 60000)
          result.push({ ...a, startTime, endTime })
          nextStart = endTime
        }

        reorderActivities(result)
      } else {
        setDragState(null)
      }
    },
    [onGesturePointerMove, dragState, currentActivities, reorderActivities],
  )

  // Store latest callbacks in refs so event listeners always use fresh closures
  const onMoveRef = useRef(onGesturePointerMove)
  const onUpRef = useRef(onGesturePointerUp)
  onMoveRef.current = onGesturePointerMove
  onUpRef.current = onGesturePointerUp

  const stableMove = useCallback((e: PointerEvent) => onMoveRef.current(e), [])
  const stableUp = useCallback((e: PointerEvent) => onUpRef.current(e), [])

  // Cancel pending long press (e.g. if finger moves too much before timer fires)
  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const startDrag = useCallback(
    (activityId: string, e: React.PointerEvent) => {
      e.stopPropagation()
      // Do NOT call e.preventDefault() here -- allow scroll to work normally
      const activity = currentActivities.find((a) => a.id === activityId)
      if (!activity || !timelineRef.current) return

      const l = layout.get(activityId)
      if (!l) return

      const rect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const relY = e.clientY - rect.top + scrollTop
      const initialOffsetInBlock = relY - l.top
      const startClientY = e.clientY

      // Start long press timer -- only activate drag after hold
      cancelLongPress()
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null
        saveSnapshot()

        gestureCommittedRef.current = false
        gestureRef.current = {
          type: "drag",
          activityId,
          startY: relY,
          initialOffsetInBlock,
          startTop: l.top,
          startHeight: l.height,
          pointerId: e.pointerId,
        }

        setDragState({
          activityId,
          ghostTop: l.top,
          ghostHeight: l.height,
          dropTargetId: null,
        })

        document.addEventListener("pointermove", stableMove)
        document.addEventListener("pointerup", stableUp)
      }, LONG_PRESS_MS)

      // If finger moves too much before timer fires, cancel the long press (user is scrolling)
      const onEarlyMove = (ev: PointerEvent) => {
        if (Math.abs(ev.clientY - startClientY) > GESTURE_THRESHOLD) {
          cancelLongPress()
          document.removeEventListener("pointermove", onEarlyMove)
          document.removeEventListener("pointerup", onEarlyUp)
        }
      }
      const onEarlyUp = () => {
        cancelLongPress()
        document.removeEventListener("pointermove", onEarlyMove)
        document.removeEventListener("pointerup", onEarlyUp)
      }
      document.addEventListener("pointermove", onEarlyMove)
      document.addEventListener("pointerup", onEarlyUp)
    },
    [currentActivities, layout, saveSnapshot, stableMove, stableUp, cancelLongPress],
  )

  const startResize = useCallback(
    (activityId: string, edge: "top" | "bottom", e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const activity = currentActivities.find((a) => a.id === activityId)
      if (!activity || !timelineRef.current) return
      saveSnapshot()
      setResizingId(activityId)

      const l = layout.get(activityId)
      if (!l) return

      const rect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const relY = e.clientY - rect.top + scrollTop

      gestureCommittedRef.current = false
      gestureRef.current = {
        type: "resize",
        activityId,
        edge,
        startY: relY,
        initialOffsetInBlock: 0,
        startTop: l.top,
        startHeight: l.height,
        pointerId: e.pointerId,
      }

      document.addEventListener("pointermove", stableMove)
      document.addEventListener("pointerup", stableUp)
    },
    [currentActivities, layout, saveSnapshot, stableMove, stableUp],
  )

  // Auto-scroll to current time ONCE on initial mount
  const hasScrolledRef = useRef(false)
  useEffect(() => {
    if (hasScrolledRef.current || !timelineRef.current) return
    hasScrolledRef.current = true

    const now = new Date()
    const scrollTarget = now.getHours() * PX_PER_HOUR + now.getMinutes() * PX_PER_MINUTE

    // Use rAF to ensure DOM has been painted with the correct scrollHeight
    requestAnimationFrame(() => {
      if (timelineRef.current) {
        timelineRef.current.scrollTop = Math.max(0, scrollTarget - 120)
      }
    })
  }, [])

  const handleSelect = useCallback(
    (id: string) => {
      // Suppress popup if a gesture (resize/drag) just ended
      if (gestureJustEndedRef.current) {
        gestureJustEndedRef.current = false
        return
      }
      setSelectedActivity((prev) => (prev === id ? null : id))
    },
    [],
  )

  // --- Empty state ---
  if (currentActivities.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6 z-10">
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

  const draggedActivity = dragState
    ? currentActivities.find((a) => a.id === dragState.activityId)
    : null

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-10" style={{ overscrollBehavior: 'none' }}>
      {/* Header */}
      <header
        className="px-3 pb-3 flex justify-between items-center border-b border-border flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <h1 className="text-base font-semibold text-foreground">Таймлайн</h1>
        <ThemeToggle />
      </header>

      {/* Timeline -- single scroll container, touch-action: pan-y blocks horizontal swipe-back */}
      <main
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ touchAction: 'pan-y', overscrollBehaviorX: 'none' }}
        ref={timelineRef}
      >
        <div className="flex">
          <TimeScale height={computedHeight} totalHours={totalHours} />

          {/* Activities Track */}
          <div className="flex-1 relative" style={{ height: `${computedHeight}px` }}>
            <CurrentTimeIndicator />

            {currentActivities.map((activity) => {
              const l = layout.get(activity.id)
              if (!l) return null

              return (
                <ActivityBlock
                  key={activity.id}
                  activity={activity}
                  top={l.top}
                  height={l.height}
                  isSelected={selectedActivity === activity.id && !dragState}
                  isDragTarget={dragState?.dropTargetId === activity.id}
                  isResizing={resizingId === activity.id}
                  isDragging={dragState?.activityId === activity.id}
                  onSelect={handleSelect}
                  onDragStart={startDrag}
                  onResizeStart={startResize}
                />
              )
            })}

            {/* Drag ghost */}
            {dragState && draggedActivity && (
              <DragGhost
                activity={draggedActivity}
                topPx={dragState.ghostTop}
                heightPx={dragState.ghostHeight}
              />
            )}
          </div>
        </div>
        {/* Spacer so last block is not hidden behind nav bar */}
        <div className="flex-shrink-0" style={{ height: 'calc(80px + env(safe-area-inset-bottom, 0px))' }} />
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
