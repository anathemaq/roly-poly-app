"use client"

import { useRef, useCallback, useState } from "react"
import { cn } from "@/lib/utils"

interface CircularTimerProps {
  /** Total duration in ms */
  totalDuration: number
  /** Remaining time in ms */
  remaining: number
  /** Current progress 0-100 (elapsed fraction) */
  progress: number
  /** Formatted time string to display */
  formattedTime: string
  /** Label below the time */
  label?: string
  /** Size of the timer in px */
  size?: number
  /** Stroke width in SVG units (viewBox is 100x100) */
  strokeWidth?: number
  /** Color class for the progress arc */
  colorClass?: string
  /** Whether dragging the thumb is enabled */
  draggable?: boolean
  /** Called continuously while dragging with new remaining ms */
  onDurationChange?: (newRemainingMs: number) => void
  /** Called once when drag ends with final remaining ms */
  onDurationCommit?: (newRemainingMs: number) => void
}

const RADIUS = 45
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

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

  // Keep refs in sync for closures
  const onDurationChangeRef = useRef(onDurationChange)
  onDurationChangeRef.current = onDurationChange
  const onDurationCommitRef = useRef(onDurationCommit)
  onDurationCommitRef.current = onDurationCommit
  const totalDurationRef = useRef(totalDuration)
  totalDurationRef.current = totalDuration

  const activeProgress = dragProgress ?? progress
  const displayTime = dragRemaining !== null ? formatMs(dragRemaining) : formattedTime

  // Convert client coordinates to angle (0 = 12 o'clock, clockwise, 0-360)
  const getAngle = useCallback((clientX: number, clientY: number): number => {
    const el = containerRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    // atan2 with y inverted for screen coords, shifted so 0 = top
    let angle = Math.atan2(clientX - cx, -(clientY - cy)) // 0 at top, CW positive
    if (angle < 0) angle += 2 * Math.PI
    return (angle / (2 * Math.PI)) * 360
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable) return

      const angleDeg = getAngle(e.clientX, e.clientY)
      const pointerProgress = (angleDeg / 360) * 100

      // Only start if pointer is near the thumb (within ~18% arc distance)
      let dist = Math.abs(pointerProgress - activeProgress)
      if (dist > 50) dist = 100 - dist
      if (dist > 18) return

      e.preventDefault()
      e.stopPropagation()
      isDraggingRef.current = true
      dragRemainingRef.current = null

      const onMove = (ev: PointerEvent) => {
        if (!isDraggingRef.current) return
        const a = getAngle(ev.clientX, ev.clientY)
        const newProgress = Math.max(0.5, Math.min(99.5, (a / 360) * 100))
        const td = totalDurationRef.current
        const newElapsed = (newProgress / 100) * td
        const newRemaining = Math.max(0, td - newElapsed)

        dragRemainingRef.current = newRemaining
        setDragProgress(newProgress)
        setDragRemaining(newRemaining)
        onDurationChangeRef.current?.(newRemaining)
      }

      const onUp = () => {
        isDraggingRef.current = false
        document.removeEventListener("pointermove", onMove)
        document.removeEventListener("pointerup", onUp)

        const finalRemaining = dragRemainingRef.current
        if (finalRemaining !== null) {
          onDurationCommitRef.current?.(finalRemaining)
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

  // Thumb position on the circle.
  // activeProgress is % elapsed. 0% = 12 o'clock, 100% = full circle.
  // SVG viewBox: center (50,50), radius 45.
  // The SVG is NOT rotated -- we draw the arc manually from the top.
  const thumbAngleRad = (activeProgress / 100) * 2 * Math.PI - Math.PI / 2
  const thumbX = 50 + RADIUS * Math.cos(thumbAngleRad)
  const thumbY = 50 + RADIUS * Math.sin(thumbAngleRad)

  // Arc: strokeDashoffset draws from 3 o'clock by default in SVG.
  // With -rotate-90 on the SVG, it starts from 12 o'clock.
  const dashOffset = CIRCUMFERENCE * (1 - activeProgress / 100)

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: size, height: size, touchAction: draggable ? "none" : "auto" }}
    >
      <svg
        className="w-full h-full -rotate-90"
        viewBox="0 0 100 100"
        onPointerDown={handlePointerDown}
      >
        {/* Background track */}
        <circle
          cx="50" cy="50" r={RADIUS}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-border"
        />
        {/* Progress arc */}
        <circle
          cx="50" cy="50" r={RADIUS}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={cn(
            colorClass,
            !isDraggingRef.current && "transition-[stroke-dashoffset] duration-300",
          )}
        />
        {/* Draggable thumb */}
        {draggable && (
          <circle
            cx={thumbX} cy={thumbY}
            r={strokeWidth / 2 + 2}
            fill="currentColor"
            className={colorClass}
            style={{ cursor: "grab", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
          />
        )}
      </svg>

      {/* Center label */}
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

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
