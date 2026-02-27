"use client"

import { useMenu } from "@/lib/menu-context"
import { MobileNav } from "@/components/mobile-nav"

export function AppContainer({ children }: { children: React.ReactNode }) {
  const { isOpen } = useMenu()

  return (
    <div
      className={`min-h-screen bg-background max-w-md mx-auto relative flex flex-col transition-transform duration-300 ease-out ${
        isOpen ? "translate-x-[280px]" : "translate-x-0"
      }`}
    >
      <div className="flex-1 pb-20">{children}</div>
      <MobileNav />
    </div>
  )
}
