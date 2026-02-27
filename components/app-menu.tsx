"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMenu } from "@/lib/menu-context"
import { usePathname } from "next/navigation"

export function AppMenu() {
  const { toggle } = useMenu()
  const pathname = usePathname()

  const isAuthPage = pathname.startsWith("/auth")

  if (isAuthPage) {
    return null
  }

  return (
    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle}>
      <Menu className="h-5 w-5" />
    </Button>
  )
}
