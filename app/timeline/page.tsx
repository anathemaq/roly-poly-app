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

// Compute visual layout: top/height for each activity, preventing overlaps
// Short blocks get minimum height, and subsequent blocks are pushed down
function computeLayout(activities: Activity[]): Map<string, { top: number; height: number }> {
  const layout = new Map<string, { top: number; height: number }>()
  let maxBottom = 0

  for (const a of activities) {
    if (!a.startTime) continue
    const naturalTop = a.startTime.getHours() * PX_PER_HOUR + a.startTime.getMinutes() * PX_PER_MINUTE
    const naturalHeight = minutesToPx(a.duration)
    const visualHeight = Math.max(MIN_BLOCK_HEIGHT, naturalHeight)

    // Ensure this block doesn't overlap with previous blocks
    const top = Math.max(naturalTop, maxBottom)
    layout.set(a.id, { top, height: visualHeight })
    maxBottom = top + visualHeight + 1 // 1px gap
  }

  return layout
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
  onSelect,
  onDragStart,
  onResizeStart,
}: ActivityBlockProps) {
  const isCompact = height < 60
  const showTime = height >= 30
  const showDuration = height >= 45

  return (
    <div
      className={cn(
        "absolute left-1 right-1 z-10 transition-opacity duration-100",
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      {/* Drop indicator line above block */}
      {isDragTarget && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full z-30" />
      )}
      <Card
        className={cn(
          "h-full relative overflow-hidden touch-none select-none",
          "transition-shadow duration-150",
          isSelected && "ring-2 ring-primary shadow-lg",
        )}
        onClick={() => onSelect(activity.id)}
      >
        <div className="p-1.5 h-full flex flex-col justify-center overflow-hidden">
          {isCompact ? (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-foreground truncate flex-1">
                {activity.name}
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatTime(activity.startTime)}-{formatTime(activity.endTime)}
              </span>
              <span className="text-[10px] font-medium text-primary whitespace-nowrap ml-0.5">
                {formatDuration(activity.duration)}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs font-medium text-foreground truncate">
                  {activity.name}
                </span>
              </div>
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
          className="absolute inset-x-0 top-3 bottom-3 cursor-grab active:cursor-grabbing z-10"
          onPointerDown={(e) => onDragStart(activity.id, e)}
        />

        {/* Resize: top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize z-20 flex items-start justify-center"
          onPointerDown={(e) => onResizeStart(activity.id, "top", e)}
        >
          <div className="w-8 h-0.5 rounded-full bg-muted-foreground/30 mt-1" />
        </div>
        {/* Resize: bottom edge */}
        <div
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-20 flex items-end justify-center"
          onPointerDown={(e) => onResizeStart(activity.id, "bottom", e)}
        >
          <div className="w-8 h-0.5 rounded-full bg-muted-foreground/30 mb-1" />
        </div>
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
      <Card className="h-full ring-2 ring-primary shadow-xl bg-primary/10">
        <div className="p-1.5 h-full flex items-center">
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
  const layout = useMemo(() => computeLayout(currentActivities), [currentActivities])

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
    initialOffsetInBlock: number // for drag: pointer offset within the block
    startTop: number
    startHeight: number
    pointerId: number
  } | null>(null)

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
      e.preventDefault()

      const rect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const relY = e.clientY - rect.top + scrollTop

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

      document.removeEventListener("pointermove", onGesturePointerMove)
      document.removeEventListener("pointerup", onGesturePointerUp)
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""

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

  const startDrag = useCallback(
    (activityId: string, e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const activity = currentActivities.find((a) => a.id === activityId)
      if (!activity || !timelineRef.current) return
      saveSnapshot()

      const l = layout.get(activityId)
      if (!l) return

      const rect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const relY = e.clientY - rect.top + scrollTop
      const initialOffsetInBlock = relY - l.top

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

      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      document.addEventListener("pointermove", stableMove)
      document.addEventListener("pointerup", stableUp)
    },
    [currentActivities, layout, saveSnapshot, stableMove, stableUp],
  )

  const startResize = useCallback(
    (activityId: string, edge: "top" | "bottom", e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const activity = currentActivities.find((a) => a.id === activityId)
      if (!activity || !timelineRef.current) return
      saveSnapshot()

      const l = layout.get(activityId)
      if (!l) return

      gestureRef.current = {
        type: "resize",
        activityId,
        edge,
        startY: e.clientY,
        initialOffsetInBlock: 0,
        startTop: l.top,
        startHeight: l.height,
        pointerId: e.pointerId,
      }

      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      document.addEventListener("pointermove", stableMove)
      document.addEventListener("pointerup", stableUp)
    },
    [currentActivities, layout, saveSnapshot, stableMove, stableUp],
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

  const draggedActivity = dragState
    ? currentActivities.find((a) => a.id === dragState.activityId)
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

            {currentActivities.map((activity) => {
              const l = layout.get(activity.id)
              if (!l) return null
              const isBeingDragged = dragState?.activityId === activity.id

              return (
                <ActivityBlock
                  key={activity.id}
                  activity={activity}
                  top={l.top}
                  height={l.height}
                  isSelected={selectedActivity === activity.id && !dragState}
                  isDragTarget={dragState?.dropTargetId === activity.id}
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
