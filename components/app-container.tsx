"use client"

import { useRef, useCallback, useEffect } from "react"
import { useMenu, MENU_WIDTH } from "@/lib/menu-context"
import { MobileNav } from "@/components/mobile-nav"
import { usePathname } from "next/navigation"

const EDGE_THRESHOLD = 30 // px from left edge to start swipe
const VELOCITY_THRESHOLD = 0.3 // px/ms to trigger open/close

export function AppContainer({ children }: { children: React.ReactNode }) {
  const { isOpen, setIsOpen, dragOffset, setDragOffset, isDragging, setIsDragging } = useMenu()
  const pathname = usePathname()
  
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const isEdgeSwipe = useRef(false)
  const hasDecidedDirection = useRef(false)
  const isHorizontalSwipe = useRef(false)

  const isAuthPage = pathname.startsWith("/auth")

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAuthPage) return
    
    const touch = e.touches[0]
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    touchStartTime.current = Date.now()
    hasDecidedDirection.current = false
    isHorizontalSwipe.current = false
    
    // Check if starting from left edge (for opening) or anywhere (for closing when open)
    isEdgeSwipe.current = touch.clientX < EDGE_THRESHOLD || isOpen
  }, [isOpen, isAuthPage])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isAuthPage || !isEdgeSwipe.current) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStartX.current
    const deltaY = touch.clientY - touchStartY.current
    
    // Decide direction on first significant move
    if (!hasDecidedDirection.current) {
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)
      
      if (absDeltaX > 10 || absDeltaY > 10) {
        hasDecidedDirection.current = true
        isHorizontalSwipe.current = absDeltaX > absDeltaY
        
        if (isHorizontalSwipe.current) {
          setIsDragging(true)
        }
      }
    }
    
    if (!isHorizontalSwipe.current) return
    
    // Prevent vertical scroll during horizontal swipe
    e.preventDefault()
    
    let newOffset: number
    if (isOpen) {
      // When menu is open, track closing gesture
      newOffset = Math.max(0, Math.min(MENU_WIDTH, MENU_WIDTH + deltaX))
    } else {
      // When menu is closed, track opening gesture
      newOffset = Math.max(0, Math.min(MENU_WIDTH, deltaX))
    }
    
    setDragOffset(newOffset)
  }, [isOpen, setDragOffset, setIsDragging, isAuthPage])

  const handleTouchEnd = useCallback(() => {
    if (isAuthPage || !isDragging) {
      isEdgeSwipe.current = false
      hasDecidedDirection.current = false
      return
    }
    
    const touchDuration = Date.now() - touchStartTime.current
    const velocity = dragOffset / touchDuration
    
    // Determine final state based on position and velocity
    const shouldOpen = isOpen
      ? dragOffset > MENU_WIDTH * 0.5 || velocity > VELOCITY_THRESHOLD
      : dragOffset > MENU_WIDTH * 0.5 || velocity > VELOCITY_THRESHOLD
    
    setIsOpen(shouldOpen)
    setDragOffset(0)
    setIsDragging(false)
    isEdgeSwipe.current = false
    hasDecidedDirection.current = false
  }, [isDragging, dragOffset, isOpen, setIsOpen, setDragOffset, setIsDragging, isAuthPage])

  // Calculate content offset
  const getTranslateX = () => {
    if (isDragging) {
      if (isOpen) {
        return dragOffset
      }
      return dragOffset
    }
    return isOpen ? MENU_WIDTH : 0
  }

  return (
    <div
      className={`min-h-screen bg-background max-w-md mx-auto relative flex flex-col ${
        isDragging ? '' : 'transition-transform duration-300 ease-out'
      }`}
      style={{ transform: `translateX(${getTranslateX()}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="flex-1 pb-20">{children}</div>
      <MobileNav />
    </div>
  )
}
