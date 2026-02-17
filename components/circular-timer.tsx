"use client"

import { useRef, useCallback, useState } from "react"
import { cn } from "@/lib/utils"

interface CircularTimerProps {
  /** Total duration in ms */
  totalDuration: number
  /** Remaining time in ms */
  remaining: number
  /** Current progress 0-100 (elapsed %) */
  progress: number
  /** Formatted time string to display */
  formattedTime: string
  /** Label below the time */
  label?: string
  /** Size of the timer in px */
  size?: number
  /** Stroke width in SVG units (viewBox 100x100) */
  strokeWidth?: number
  /** Color class for the progress arc */
  colorClass?: string
  /** Whether the draggable thumb is visible and interactive */
  draggable?: boolean
  /** Called continuously while dragging */
  onDurationChange?: (newRemainingMs: number) => void
  /** Called once on drag end */
  onDurationCommit?: (newRemainingMs: number) => void
}

const CX = 50
const CY = 50
const RADIUS = 45

/**
 * Compute the SVG arc path for a given progress (0–100).
 * Arc starts at 12-o'clock and goes clockwise.
 */
function arcPath(progress: number): string {
  if (progress <= 0) return ""
  if (progress >= 100) {
    // Full circle — two half-arcs
    return [
      `M ${CX} ${CY - RADIUS}`,
      `A ${RADIUS} ${RADIUS} 0 1 1 ${CX} ${CY + RADIUS}`,
      `A ${RADIUS} ${RADIUS} 0 1 1 ${CX} ${CY - RADIUS}`,
    ].join(" ")
  }
  const angle = (progress / 100) * 2 * Math.PI
  const endX = CX + RADIUS * Math.sin(angle)
  const endY = CY - RADIUS * Math.cos(angle)
  const largeArc = progress > 50 ? 1 : 0
  return `M ${CX} ${CY - RADIUS} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${endX} ${endY}`
}

/** Point on the circle at a given progress (0-100). 0 = top, clockwise. */
function pointOnCircle(progress: number) {
  const angle = (progress / 100) * 2 * Math.PI
  return {
    x: CX + RADIUS * Math.sin(angle),
    y: CY - RADIUS * Math.cos(angle),
  }
}

function formatMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function CircularTimer({
  totalDuration,
  remaining,
  progress,
  formattedTime,
  label,
  size = 160,
  strokeWidth = 8,
  colorClass = "text-primary",
  draggable = false,
  onDurationChange,
  onDurationCommit,
}: CircularTimerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragRemainingRef = useRef<number | null>(null)

  const [dragProgress, setDragProgress] = useState<number | null>(null)
  const [dragRemaining, setDragRemaining] = useState<number | null>(null)

  // Refs to avoid stale closures in document listeners
  const onDurationChangeRef = useRef(onDurationChange)
  onDurationChangeRef.current = onDurationChange
  const onDurationCommitRef = useRef(onDurationCommit)
  onDurationCommitRef.current = onDurationCommit
  const totalDurationRef = useRef(totalDuration)
  totalDurationRef.current = totalDuration

  const activeProgress = dragProgress ?? progress
  const displayTime = dragRemaining !== null ? formatMs(dragRemaining) : formattedTime

  /**
   * Convert screen (clientX, clientY) to an angle 0-360.
   * 0 = 12-o'clock, clockwise.
   */
  const getAngle = useCallback((clientX: number, clientY: number): number => {
    const el = containerRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    // atan2(dx, -dy) gives 0 at top, positive clockwise
    let a = Math.atan2(dx, -dy)
    if (a < 0) a += 2 * Math.PI
    return (a / (2 * Math.PI)) * 360
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable) return

      const angleDeg = getAngle(e.clientX, e.clientY)
      const pointerProgress = (angleDeg / 360) * 100

      // Only start if pointer is near the current thumb position
      let dist = Math.abs(pointerProgress - activeProgress)
      if (dist > 50) dist = 100 - dist // wrap-around
      if (dist > 15) return

      e.preventDefault()
      e.stopPropagation()
      isDraggingRef.current = true
      dragRemainingRef.current = null

      const onMove = (ev: PointerEvent) => {
        if (!isDraggingRef.current) return
        ev.preventDefault()
        const a = getAngle(ev.clientX, ev.clientY)
        const newProgress = Math.max(0.5, Math.min(99.5, (a / 360) * 100))
        const td = totalDurationRef.current
        const newRemaining = Math.max(0, td - (newProgress / 100) * td)

        dragRemainingRef.current = newRemaining
        setDragProgress(newProgress)
        setDragRemaining(newRemaining)
        onDurationChangeRef.current?.(newRemaining)
      }

      const onUp = () => {
        isDraggingRef.current = false
        document.removeEventListener("pointermove", onMove)
        document.removeEventListener("pointerup", onUp)

        const final = dragRemainingRef.current
        if (final !== null) {
          onDurationCommitRef.current?.(final)
        }
        dragRemainingRef.current = null
        setDragProgress(null)
        setDragRemaining(null)
      }

      document.addEventListener("pointermove", onMove)
      document.addEventListener("pointerup", onUp)
    },
    [draggable, getAngle, activeProgress],
  )

  // Thumb position
  const thumb = pointOnCircle(activeProgress)
  const thumbR = strokeWidth / 2 + 1.5

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: size, height: size, touchAction: draggable ? "none" : "auto" }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        onPointerDown={handlePointerDown}
      >
        {/* Background track */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-border"
        />
        {/* Progress arc — drawn as a path so no rotate-90 hack needed */}
        {activeProgress > 0 && (
          <path
            d={arcPath(activeProgress)}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={cn(colorClass)}
          />
        )}
        {/* Draggable thumb */}
        {draggable && (
          <circle
            cx={thumb.x}
            cy={thumb.y}
            r={thumbR}
            fill="currentColor"
            className={colorClass}
            style={{
              cursor: isDraggingRef.current ? "grabbing" : "grab",
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
            }}
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div
            className="font-bold text-foreground"
            style={{ fontSize: size * 0.19 }}
          >
            {displayTime}
          </div>
          {label && (
            <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
          )}
        </div>
      </div>
    </div>
  )
}
