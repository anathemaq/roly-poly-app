"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

interface FABPortalProps {
  children: React.ReactNode
  show: boolean
}

export function FABPortal({ children, show }: FABPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !show) return null

  return createPortal(
    children,
    document.body
  )
}
