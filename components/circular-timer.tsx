"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CircularTimerProps {
  /** Total duration in ms (used for progress calculation) */
  totalDuration: number
  /** Remaining time in ms */
  remaining: number
  /** Current progress 0-100 */
  progress: number
  /** Formatted time string to display */
  formattedTime: string
  /** Label below the time */
  label?: string
  /** Size of the timer in px */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Color class for the progress arc */
  colorClass?: string
  /** Whether dragging the thumb is enabled */
  draggable?: boolean
  /** Called with new remaining ms when user drags the thumb */
  onDurationChange?: (newRemainingMs: number) => void
  /** Called when drag ends */
  onDurationCommit?: (newRemainingMs: number) => void
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
  const svgRef = useRef<SVGSVGElement>(null)
  const isDraggingRef = useRef(false)
  const [localProgress, setLocalProgress] = useState<number | null>(null)
  const [localRemaining, setLocalRemaining] = useState<number | null>(null)

  const radius = 45
  const circumference = 2 * Math.PI * radius
  const activeProgress = localProgress !== null ? localProgress : progress
  const displayTime = localRemaining !== null ? formatMs(localRemaining) : formattedTime

  // Compute angle from pointer position relative to SVG center
  const getAngleFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return 0

      const rect = svg.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = clientX - cx
      const dy = clientY - cy

      // atan2 gives angle from positive x-axis. We want angle from top (12 o'clock)
      // Top = -PI/2 in standard math coords
      let angle = Math.atan2(dy, dx) + Math.PI / 2
      if (angle < 0) angle += 2 * Math.PI
      return angle
    },
    [],
  )

  const angleToProgress = useCallback((angle: number) => {
    return (angle / (2 * Math.PI)) * 100
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable) return

      const angle = getAngleFromPointer(e.clientX, e.clientY)
      const pointerProgress = angleToProgress(angle)

      // Only start drag if pointer is near the thumb (within 15% of arc)
      if (Math.abs(pointerProgress - activeProgress) > 15 &&
          Math.abs(pointerProgress - activeProgress) < 85) return

      e.preventDefault()
      e.stopPropagation()
      isDraggingRef.current = true
      ;(e.target as SVGElement).setPointerCapture(e.pointerId)
    },
    [draggable, getAngleFromPointer, angleToProgress, activeProgress],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return

      const angle = getAngleFromPointer(e.clientX, e.clientY)
      const newProgress = Math.max(0.5, Math.min(99.5, angleToProgress(angle)))
      const newElapsed = (newProgress / 100) * totalDuration
      const newRemaining = Math.max(0, totalDuration - newElapsed)

      setLocalProgress(newProgress)
      setLocalRemaining(newRemaining)
      onDurationChange?.(newRemaining)
    },
    [getAngleFromPointer, angleToProgress, totalDuration, onDurationChange],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false

      if (localRemaining !== null) {
        onDurationCommit?.(localRemaining)
      }

      setLocalProgress(null)
      setLocalRemaining(null)
    },
    [localRemaining, onDurationCommit],
  )

  // Thumb position: point on circle at the progress angle
  const thumbAngle = ((activeProgress / 100) * 2 * Math.PI) - Math.PI / 2
  const thumbX = 50 + radius * Math.cos(thumbAngle)
  const thumbY = 50 + radius * Math.sin(thumbAngle)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        ref={svgRef}
        className="w-full h-full -rotate-90"
        viewBox="0 0 100 100"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: draggable ? "none" : "auto" }}
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - activeProgress / 100)}
          strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-300", colorClass)}
          style={isDraggingRef.current ? { transition: "none" } : undefined}
        />
        {/* Draggable thumb */}
        {draggable && (
          <circle
            cx={thumbX}
            cy={thumbY}
            r={strokeWidth / 2 + 1.5}
            fill="currentColor"
            className={colorClass}
            style={{ cursor: "grab", filter: "drop-shadow(0 0 2px rgba(0,0,0,0.3))" }}
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground">{displayTime}</div>
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
