"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { User, LogOut, Bookmark, Heart } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useMenu, MENU_WIDTH } from "@/lib/menu-context"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  nickname: string
  avatar_url: string | null
}

// Cache for user data
let cachedUser: SupabaseUser | null = null
let cachedProfile: Profile | null = null

export function SidebarMenu() {
  const { isOpen, setIsOpen, dragOffset, isDragging } = useMenu()
  const [user, setUser] = useState<SupabaseUser | null>(cachedUser)
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [isLoading, setIsLoading] = useState(!cachedUser)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const hasFetched = useRef(false)

  const isAuthPage = pathname.startsWith("/auth")

  useEffect(() => {
    if (isAuthPage) {
      setIsLoading(false)
      return
    }

    if (cachedUser && hasFetched.current) {
      return
    }

    const getUser = async () => {
      hasFetched.current = true
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      cachedUser = user

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", user.id)
          .single()

        setProfile(profileData)
        cachedProfile = profileData
      }
      setIsLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      cachedUser = session?.user ?? null
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", session.user.id)
          .single()
        setProfile(profileData)
        cachedProfile = profileData
      } else {
        setProfile(null)
        cachedProfile = null
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, isAuthPage])

  if (isAuthPage) {
    return null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push("/auth/login")
  }

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    router.push(path)
  }

  const displayName = profile?.nickname || user?.email?.split("@")[0] || "Пользователь"

  // Calculate sidebar position
  const getTranslateX = () => {
    if (isDragging) {
      return Math.min(0, -MENU_WIDTH + dragOffset)
    }
    return isOpen ? 0 : -MENU_WIDTH
  }

  // Calculate overlay opacity
  const getOverlayOpacity = () => {
    if (isDragging) {
      return Math.min(0.5, (dragOffset / MENU_WIDTH) * 0.5)
    }
    return isOpen ? 0.5 : 0
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black z-40 ${
          isDragging ? '' : 'transition-opacity duration-300 ease-out'
        } ${isOpen || isDragging ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ opacity: getOverlayOpacity() }}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-background border-r border-border z-50 ${
          isDragging ? '' : 'transition-transform duration-300 ease-out'
        }`}
        style={{ 
          width: MENU_WIDTH,
          transform: `translateX(${getTranslateX()}px)`,
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* User Profile Section */}
        {!isLoading && user && (
          <button
            onClick={() => handleNavigate("/profile")}
            className="w-full px-4 py-4 hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-base font-medium truncate">{displayName}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </button>
        )}

        <Separator />

        {/* Navigation Links */}
        <nav className="py-2">
          <button
            onClick={() => handleNavigate("/favorites")}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <Bookmark className="h-5 w-5 text-muted-foreground" />
            Избранные шаблоны
          </button>
          <button
            onClick={() => handleNavigate("/my-published")}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <Heart className="h-5 w-5 text-muted-foreground" />
            Мои публикации
          </button>
        </nav>

        <Separator />

        {/* Logout */}
        <div className="py-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-accent transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Выйти
          </button>
        </div>
      </aside>
    </>
  )
}
