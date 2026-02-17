"use client"

import React, { useEffect, useRef, useCallback } from "react"

interface PickerOption {
  id: string
  label: string
}

interface IOSPickerProps {
  options: PickerOption[]
  value: string
  onChange: (value: string) => void
  onChangeCommitted?: (value: string) => void
}

const ITEM_HEIGHT = 44
const VISIBLE_COUNT = 5
const CENTER = Math.floor(VISIBLE_COUNT / 2)

// iOS-style deceleration physics
const DECELERATION = 0.992 // per-ms multiplier
const MIN_VELOCITY = 0.08 // px/ms threshold to enter snap phase
const SNAP_STIFFNESS = 0.08 // spring pull towards target (lower = softer)
const SNAP_FRICTION = 0.85 // velocity damping per frame in snap mode (lower = stops faster)

/**
 * Zero-rerender iOS-style wheel picker.
 * All animation runs via refs + rAF + direct DOM writes.
 */
export function IOSPicker({ options, value, onChange, onChangeCommitted }: IOSPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  // --- Animation state (never triggers React render) ---
  const offsetRef = useRef(0) // current scroll offset in px (positive = scrolled down)
  const velocityRef = useRef(0) // px per ms
  const rafRef = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const lastYRef = useRef(0)
  const lastTimeRef = useRef(0)
  const lastReportedRef = useRef(-1)
  const totalHeight = options.length * ITEM_HEIGHT

  // Sync initial value
  const initialIdx = options.findIndex((o) => o.id === value)
  if (offsetRef.current === 0 && initialIdx > 0) {
    offsetRef.current = initialIdx * ITEM_HEIGHT
  }

  // --- Wrap offset into [0, totalHeight) for infinite scroll ---
  const wrapOffset = useCallback(
    (off: number) => ((off % totalHeight) + totalHeight) % totalHeight,
    [totalHeight],
  )

  // --- Render a single frame (direct DOM writes, no setState) ---
  const paint = useCallback(() => {
    const wrapped = wrapOffset(offsetRef.current)
    const centerIdx = wrapped / ITEM_HEIGHT
    const baseIdx = Math.floor(centerIdx)
    const frac = centerIdx - baseIdx

    for (let slot = 0; slot < VISIBLE_COUNT; slot++) {
      const el = itemsRef.current[slot]
      if (!el) continue

      const relSlot = slot - CENTER // -2, -1, 0, 1, 2
      const itemOffset = relSlot + frac // fractional distance from center
      const rawIdx = baseIdx - relSlot
      const idx = ((rawIdx % options.length) + options.length) % options.length

      // iOS-style 3D cylinder effect
      const absOff = Math.abs(itemOffset)
      const scale = Math.max(0.6, 1 - absOff * 0.18)
      const opacity = Math.max(0.25, 1 - absOff * 0.35)
      const translateY = -itemOffset * ITEM_HEIGHT
      const rotateX = itemOffset * 18 // degrees

      el.style.transform = `translateY(${translateY}px) perspective(400px) rotateX(${rotateX}deg) scale(${scale})`
      el.style.opacity = String(opacity)

      // Update text
      const span = el.firstElementChild as HTMLElement | null
      if (span) {
        span.textContent = options[idx]?.label ?? ""
        const isCenter = absOff < 0.5
        span.style.fontWeight = isCenter ? "700" : "500"
        span.style.fontSize = isCenter ? "20px" : "16px"
        span.className = isCenter ? "text-foreground" : "text-muted-foreground"
      }
    }

    // Report selection change (throttled)
    const nearestIdx = Math.round(wrapped / ITEM_HEIGHT) % options.length
    if (nearestIdx !== lastReportedRef.current) {
      lastReportedRef.current = nearestIdx
      const opt = options[nearestIdx]
      if (opt) onChange(opt.id)
    }
  }, [options, wrapOffset, onChange])

  // --- Momentum + snap animation loop ---
  const animate = useCallback(() => {
    if (isDraggingRef.current) return

    const now = performance.now()
    const dt = Math.min(now - lastTimeRef.current, 32) // cap at ~30fps min
    lastTimeRef.current = now

    let v = velocityRef.current

    if (Math.abs(v) > MIN_VELOCITY) {
      // Momentum phase: apply velocity then decelerate
      v *= Math.pow(DECELERATION, dt)
      offsetRef.current += v * dt
      velocityRef.current = v

      paint()
      rafRef.current = requestAnimationFrame(animate)
    } else {
      // Snap phase: spring towards nearest item
      const wrapped = wrapOffset(offsetRef.current)
      const nearestSnap = Math.round(wrapped / ITEM_HEIGHT) * ITEM_HEIGHT
      let distToSnap = nearestSnap - wrapped

      // Normalize for wrapping
      if (distToSnap > totalHeight / 2) distToSnap -= totalHeight
      if (distToSnap < -totalHeight / 2) distToSnap += totalHeight

      if (Math.abs(distToSnap) > 0.3 || Math.abs(v) > 0.001) {
        // Spring: accelerate towards snap, then friction kills velocity
        v = v * SNAP_FRICTION + distToSnap * SNAP_STIFFNESS
        offsetRef.current += v
        velocityRef.current = v

        paint()
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Settled: lock to exact position
        offsetRef.current = wrapOffset(nearestSnap)
        velocityRef.current = 0
        paint()

        const idx = Math.round(offsetRef.current / ITEM_HEIGHT) % options.length
        const opt = options[idx]
        if (opt) {
          onChange(opt.id)
          onChangeCommitted?.(opt.id)
        }
      }
    }
  }, [options, totalHeight, wrapOffset, paint, onChange, onChangeCommitted])

  // --- Pointer handlers ---
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Stop any running animation
      cancelAnimationFrame(rafRef.current)

      isDraggingRef.current = true
      lastYRef.current = e.clientY
      lastTimeRef.current = performance.now()
      velocityRef.current = 0
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return

      const now = performance.now()
      const dy = e.clientY - lastYRef.current
      const dt = Math.max(now - lastTimeRef.current, 1)

      offsetRef.current -= dy
      // Smooth velocity with EMA and cap max speed
      const rawV = -dy / dt
      const maxV = 3.0 // px/ms — prevents wild flings
      const clampedV = Math.max(-maxV, Math.min(maxV, rawV))
      velocityRef.current = velocityRef.current * 0.3 + clampedV * 0.7

      lastYRef.current = e.clientY
      lastTimeRef.current = now

      paint()
    },
    [paint],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      lastTimeRef.current = performance.now()
      rafRef.current = requestAnimationFrame(animate)
    },
    [animate],
  )

  // Handle click on non-center items to scroll to them
  const handleItemClick = useCallback(
    (slot: number) => {
      if (isDraggingRef.current) return
      const relSlot = slot - CENTER
      if (relSlot === 0) return // already center

      cancelAnimationFrame(rafRef.current)
      offsetRef.current -= relSlot * ITEM_HEIGHT
      velocityRef.current = 0
      lastTimeRef.current = performance.now()
      rafRef.current = requestAnimationFrame(animate)
    },
    [animate],
  )

  // --- Sync from external value changes ---
  useEffect(() => {
    const idx = options.findIndex((o) => o.id === value)
    if (idx === -1) return

    const targetOffset = idx * ITEM_HEIGHT
    const wrapped = wrapOffset(offsetRef.current)
    const currentIdx = Math.round(wrapped / ITEM_HEIGHT) % options.length

    if (currentIdx !== idx && !isDraggingRef.current) {
      offsetRef.current = targetOffset
      paint()
    }
  }, [value, options, wrapOffset, paint])

  // Initial paint
  useEffect(() => {
    paint()
  }, [paint])

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ touchAction: "none", cursor: "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Edge gradients */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-20" />

      {/* Selection indicator */}
      <div
        className="absolute inset-x-4 z-10 pointer-events-none rounded-lg border border-primary/20"
        style={{
          top: `calc(50% - ${ITEM_HEIGHT / 2}px)`,
          height: `${ITEM_HEIGHT}px`,
        }}
      />

      {/* Picker items (fixed number of slots, reused) */}
      <div className="relative h-full flex flex-col items-center justify-center">
        {Array.from({ length: VISIBLE_COUNT }, (_, slot) => (
          <div
            key={slot}
            ref={(el) => { itemsRef.current[slot] = el }}
            className="absolute flex items-center justify-center w-full"
            style={{
              height: `${ITEM_HEIGHT}px`,
              willChange: "transform, opacity",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
            onClick={() => handleItemClick(slot)}
          >
            <span className="text-muted-foreground transition-colors duration-150" />
          </div>
        ))}
      </div>
    </div>
  )
}
