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
const DECELERATION = 0.992 // per-ms friction multiplier
const MIN_VELOCITY = 0.08 // px/ms — below this, stop momentum and snap

/**
 * Zero-rerender iOS-style wheel picker.
 * All animation runs via refs + rAF + direct DOM writes.
 */
export function IOSPicker({ options, value, onChange, onChangeCommitted }: IOSPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  // --- Animation state (never triggers React render) ---
  const offsetRef = useRef(0) // current scroll offset in px
  const velocityRef = useRef(0) // px per ms
  const rafRef = useRef<number>(0)
  const isDraggingRef = useRef(false)
  const lastYRef = useRef(0)
  const lastTimeRef = useRef(0)
  const lastReportedRef = useRef(-1)
  const pointerHistoryRef = useRef<{ y: number; t: number }[]>([])
  // Snap target (absolute, unwrapped offset to animate towards)
  const snapTargetRef = useRef<number | null>(null)
  const phaseRef = useRef<"momentum" | "snap" | "idle">("idle")
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

  // Find nearest snap point relative to current unwrapped offset
  const findSnapTarget = useCallback(
    (offset: number) => {
      // Work in unwrapped space: find nearest multiple of ITEM_HEIGHT
      const nearestIdx = Math.round(offset / ITEM_HEIGHT)
      return nearestIdx * ITEM_HEIGHT
    },
    [],
  )

  // --- Animation loop ---
  const animate = useCallback(() => {
    if (isDraggingRef.current) return

    const now = performance.now()
    const dt = Math.min(now - lastTimeRef.current, 32)
    lastTimeRef.current = now

    if (phaseRef.current === "momentum") {
      let v = velocityRef.current
      v *= Math.pow(DECELERATION, dt)
      offsetRef.current += v * dt
      velocityRef.current = v

      if (Math.abs(v) < MIN_VELOCITY) {
        // Transition to snap: compute target from current position
        phaseRef.current = "snap"
        snapTargetRef.current = findSnapTarget(offsetRef.current)
        velocityRef.current = 0
      }

      paint()
      rafRef.current = requestAnimationFrame(animate)
    } else if (phaseRef.current === "snap") {
      const target = snapTargetRef.current!
      const dist = target - offsetRef.current

      if (Math.abs(dist) < 0.5) {
        // Settled
        offsetRef.current = target
        phaseRef.current = "idle"
        velocityRef.current = 0
        paint()

        const wrapped = wrapOffset(target)
        const idx = Math.round(wrapped / ITEM_HEIGHT) % options.length
        const opt = options[idx]
        if (opt) {
          onChange(opt.id)
          onChangeCommitted?.(opt.id)
        }
      } else {
        // Lerp towards target (ease-out)
        offsetRef.current += dist * 0.15
        paint()
        rafRef.current = requestAnimationFrame(animate)
      }
    }
  }, [options, wrapOffset, findSnapTarget, paint, onChange, onChangeCommitted])

  // --- Pointer handlers ---
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Stop any running animation
      cancelAnimationFrame(rafRef.current)

      isDraggingRef.current = true
      lastYRef.current = e.clientY
      lastTimeRef.current = performance.now()
      velocityRef.current = 0
      pointerHistoryRef.current = [{ y: e.clientY, t: performance.now() }]
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return

      const now = performance.now()
      const dy = e.clientY - lastYRef.current

      offsetRef.current -= dy
      lastYRef.current = e.clientY
      lastTimeRef.current = now

      // Keep last 100ms of pointer history for velocity calculation on release
      const history = pointerHistoryRef.current
      history.push({ y: e.clientY, t: now })
      while (history.length > 1 && now - history[0].t > 100) {
        history.shift()
      }

      paint()
    },
    [paint],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false

      // Compute release velocity from pointer history (not last frame)
      const history = pointerHistoryRef.current
      const now = performance.now()
      history.push({ y: e.clientY, t: now })

      // Use oldest point within last 80ms for stable velocity
      let startPoint = history[0]
      for (let i = history.length - 1; i >= 0; i--) {
        if (now - history[i].t >= 30) {
          startPoint = history[i]
          break
        }
      }

      const dt = now - startPoint.t
      if (dt > 5) {
        const dy = e.clientY - startPoint.y
        const rawV = -dy / dt
        // Cap velocity
        const maxV = 2.5
        velocityRef.current = Math.max(-maxV, Math.min(maxV, rawV))
      } else {
        velocityRef.current = 0
      }

      pointerHistoryRef.current = []
      lastTimeRef.current = now

      // Decide phase: momentum if enough velocity, otherwise snap directly
      if (Math.abs(velocityRef.current) > MIN_VELOCITY) {
        phaseRef.current = "momentum"
      } else {
        phaseRef.current = "snap"
        snapTargetRef.current = findSnapTarget(offsetRef.current)
      }

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
      velocityRef.current = 0
      phaseRef.current = "snap"
      snapTargetRef.current = findSnapTarget(offsetRef.current - relSlot * ITEM_HEIGHT)
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
