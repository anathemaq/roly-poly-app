"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"

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

  // Block scroll using overscroll-behavior when dragging
  useEffect(() => {
    if (draggedIndex !== null) {
      // Use overscroll-behavior instead of overflow:hidden to prevent nav issues
      document.documentElement.style.overscrollBehavior = 'none'
      document.body.style.overscrollBehavior = 'none'
      document.body.style.touchAction = 'none'
      
      return () => {
        document.documentElement.style.overscrollBehavior = ''
        document.body.style.overscrollBehavior = ''
        document.body.style.touchAction = ''
      }
    }
  }, [draggedIndex])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, index: number) => {
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
        }
      }, longPressDuration)
    },
    [longPressDuration],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent, items: HTMLElement[]) => {
      const touch = e.touches[0]
      currentY.current = touch.clientY

      // Check if moved significantly before drag started
      if (Math.abs(currentY.current - startY.current) > 10 && !isDragging.current) {
        hasMoved.current = true
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
      }

      if (isDragging.current && draggedIndex !== null) {
        // Prevent scroll only during active drag
        e.preventDefault()
        e.stopPropagation()

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
