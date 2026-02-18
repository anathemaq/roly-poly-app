"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useCallback, useTransition } from "react"
import { Home, Calendar, LayoutTemplate, Clock, Target } from "lucide-react"

const navItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/today", label: "Сегодня", icon: Calendar },
  { href: "/templates", label: "Шаблоны", icon: LayoutTemplate },
  { href: "/timeline", label: "Таймлайн", icon: Clock },
  { href: "/focus", label: "Помодоро", icon: Target },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Prefetch all routes on mount for instant navigation
  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href))
  }, [router])

  const navigate = useCallback((href: string) => {
    startTransition(() => {
      router.replace(href)
    })
  }, [router, startTransition])

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-1 -mb-[11px]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg flex-1 min-h-[48px] ${
                isActive ? "text-primary" : "text-muted-foreground active:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "fill-primary" : ""}`} />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
