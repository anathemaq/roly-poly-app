"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"

interface UseTouchDragOptions {
  onReorder: (fromIndex: number, toIndex: number) => void
  onTap?: (index: number) => void
  longPressDuration?: number
}

export function useTouchDrag({ onReorder, onTap, longPressDuration = 250 }: UseTouchDragOptions) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startX = useRef(0)
  const currentY = useRef(0)
  const hasMoved = useRef(false)
  const autoScrollRef = useRef<number>(0)
  const itemsRef = useRef<HTMLElement[]>([])

  // Auto-scroll when dragging near viewport edges
  const performAutoScroll = useCallback((clientY: number) => {
    const EDGE_ZONE = 80
    const SCROLL_SPEED = 8
    const viewportHeight = window.innerHeight

    cancelAnimationFrame(autoScrollRef.current)

    if (clientY < EDGE_ZONE && isDragging.current) {
      const tick = () => {
        if (!isDragging.current) return
        window.scrollBy(0, -SCROLL_SPEED)
        autoScrollRef.current = requestAnimationFrame(tick)
      }
      autoScrollRef.current = requestAnimationFrame(tick)
    } else if (clientY > viewportHeight - EDGE_ZONE && isDragging.current) {
      const tick = () => {
        if (!isDragging.current) return
        window.scrollBy(0, SCROLL_SPEED)
        autoScrollRef.current = requestAnimationFrame(tick)
      }
      autoScrollRef.current = requestAnimationFrame(tick)
    }
  }, [])

  // Block page scroll when dragging - use event listener on document
  useEffect(() => {
    if (draggedIndex !== null) {
      const preventDefault = (e: TouchEvent) => {
        if (isDragging.current) {
          e.preventDefault()
        }
      }
      
      // Add non-passive listener to be able to preventDefault
      document.addEventListener('touchmove', preventDefault, { passive: false })
      
      return () => {
        document.removeEventListener('touchmove', preventDefault)
        cancelAnimationFrame(autoScrollRef.current)
      }
    }
  }, [draggedIndex])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, index: number) => {
      const touch = e.touches[0]
      startY.current = touch.clientY
      startX.current = touch.clientX
      currentY.current = touch.clientY
      hasMoved.current = false
      isDragging.current = false

      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        if (!hasMoved.current) {
          isDragging.current = true
          setDraggedIndex(index)
          setDragOverIndex(index)
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
      itemsRef.current = items

      // Check if moved significantly before drag started (to allow normal scroll)
      const deltaY = Math.abs(currentY.current - startY.current)
      const deltaX = Math.abs(touch.clientX - startX.current)
      
      if ((deltaY > 10 || deltaX > 10) && !isDragging.current) {
        hasMoved.current = true
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
      }

      if (isDragging.current && draggedIndex !== null) {
        // Auto-scroll when near edges
        performAutoScroll(touch.clientY)

        // Find which item we're over based on center point
        const touchY = touch.clientY
        let newOverIndex = draggedIndex

        for (let i = 0; i < items.length; i++) {
          const rect = items[i].getBoundingClientRect()
          const itemCenter = rect.top + rect.height / 2
          if (touchY < itemCenter) {
            newOverIndex = i
            break
          }
          newOverIndex = i
        }

        if (newOverIndex !== dragOverIndex) {
          setDragOverIndex(newOverIndex)
        }
      }
    },
    [draggedIndex, dragOverIndex, performAutoScroll],
  )

  const handleTouchEnd = useCallback(
    (index: number) => {
      cancelAnimationFrame(autoScrollRef.current)
      
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
    cancelAnimationFrame(autoScrollRef.current)
    
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
