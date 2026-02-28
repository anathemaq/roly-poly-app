"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface MenuContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

export function MenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = () => setIsOpen(prev => !prev)

  return (
    <MenuContext.Provider value={{ isOpen, setIsOpen, toggle }}>
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
