"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"

interface UseTouchDragOptions {
  onReorder: (fromIndex: number, toIndex: number) => void
  onTap?: (index: number) => void
  longPressDuration?: number
}

export function useTouchDrag({ onReorder, onTap, longPressDuration = 500 }: UseTouchDragOptions) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const currentY = useRef(0)
  const hasMoved = useRef(false)
  // Scroll lock state
  const preventMoveRef = useRef<((ev: TouchEvent) => void) | null>(null)
  const savedScrollYRef = useRef<number>(0)
  const prevBodyOverflowRef = useRef<string>("")
  const prevHtmlOverflowRef = useRef<string>("")
  const prevBodyWidthRef = useRef<string>("")
  const prevBodyPositionRef = useRef<string>("")
  const prevBodyTopRef = useRef<string>("")

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, index: number) => {
      // Пока ждём лонг‑пресс — скролл не блокируем, заблокируем при фактическом старте drag
      const touch = e.touches[0]
      startY.current = touch.clientY
      currentY.current = touch.clientY
      hasMoved.current = false
      isDragging.current = false

      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        if (!hasMoved.current) {
          isDragging.current = true
          setDraggedIndex(index)
          // Haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          // Lock page scroll (mobile safe)
          savedScrollYRef.current = window.scrollY || window.pageYOffset || 0
          prevBodyOverflowRef.current = document.body.style.overflow
          prevHtmlOverflowRef.current = document.documentElement.style.overflow
          prevBodyPositionRef.current = document.body.style.position
          prevBodyTopRef.current = (document.body.style as any).top || ""
          prevBodyWidthRef.current = document.body.style.width
          document.body.style.overflow = "hidden"
          document.documentElement.style.overflow = "hidden"
          // fix body to freeze scroll position
          document.body.style.position = "fixed"
          ;(document.body.style as any).top = `-${savedScrollYRef.current}px`
          document.body.style.width = "100%"
          // prevent default scrolling on touchmove globally
          preventMoveRef.current = (ev: TouchEvent) => ev.preventDefault()
          document.addEventListener("touchmove", preventMoveRef.current, { passive: false })
        }
      }, longPressDuration)
    },
    [longPressDuration],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent, items: HTMLElement[]) => {
      const touch = e.touches[0]
      currentY.current = touch.clientY

      // Check if moved significantly
      if (Math.abs(currentY.current - startY.current) > 10) {
        hasMoved.current = true
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
      }

      if (isDragging.current && draggedIndex !== null) {
        e.preventDefault()

        // Find which item we're over
        const touchY = touch.clientY
        let newOverIndex = draggedIndex

        for (let i = 0; i < items.length; i++) {
          const rect = items[i].getBoundingClientRect()
          if (touchY >= rect.top && touchY <= rect.bottom) {
            newOverIndex = i
            break
          }
        }

        if (newOverIndex !== dragOverIndex) {
          setDragOverIndex(newOverIndex)
        }
      }
    },
    [draggedIndex, dragOverIndex],
  )

  const handleTouchEnd = useCallback(
    (index: number) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }

      if (isDragging.current && draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
        onReorder(draggedIndex, dragOverIndex)
      } else if (!hasMoved.current && !isDragging.current && onTap) {
        // It was a tap
        onTap(index)
      }

      setDraggedIndex(null)
      setDragOverIndex(null)
      isDragging.current = false
      hasMoved.current = false
      // Unlock page scroll
      if (preventMoveRef.current) {
        document.removeEventListener("touchmove", preventMoveRef.current as any)
        preventMoveRef.current = null
      }
      document.body.style.overflow = prevBodyOverflowRef.current
      document.documentElement.style.overflow = prevHtmlOverflowRef.current
      document.body.style.position = prevBodyPositionRef.current
      ;(document.body.style as any).top = prevBodyTopRef.current
      document.body.style.width = prevBodyWidthRef.current
      if (savedScrollYRef.current) {
        window.scrollTo(0, savedScrollYRef.current)
      }
    },
    [draggedIndex, dragOverIndex, onReorder, onTap],
  )

  const handleTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
    isDragging.current = false
    hasMoved.current = false
    // Unlock page scroll (cancel)
    if (preventMoveRef.current) {
      document.removeEventListener("touchmove", preventMoveRef.current as any)
      preventMoveRef.current = null
    }
    document.body.style.overflow = prevBodyOverflowRef.current
    document.documentElement.style.overflow = prevHtmlOverflowRef.current
    document.body.style.position = prevBodyPositionRef.current
    ;(document.body.style as any).top = prevBodyTopRef.current
    document.body.style.width = prevBodyWidthRef.current
    if (savedScrollYRef.current) {
      window.scrollTo(0, savedScrollYRef.current)
    }
  }, [])

  return {
    draggedIndex,
    dragOverIndex,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  }
}
