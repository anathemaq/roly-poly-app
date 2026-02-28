"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface MenuContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
  dragOffset: number
  setDragOffset: (offset: number) => void
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

const MENU_WIDTH = 280

export function MenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  return (
    <MenuContext.Provider value={{ 
      isOpen, 
      setIsOpen, 
      toggle, 
      dragOffset, 
      setDragOffset,
      isDragging,
      setIsDragging
    }}>
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (!context) {
    throw new Error("useMenu must be used within a MenuProvider")
  }
  return context
}

export { MENU_WIDTH }
