'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, User, LogOut, Bookmark, Heart } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Profile {
  nickname: string
  avatar_url: string | null
}

// Cache for user data
let cachedUser: SupabaseUser | null = null
let cachedProfile: Profile | null = null

export function AppMenu() {
  const [user, setUser] = useState<SupabaseUser | null>(cachedUser)
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [isLoading, setIsLoading] = useState(!cachedUser)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const hasFetched = useRef(false)
  
  const isAuthPage = pathname.startsWith('/auth')

  useEffect(() => {
    if (isAuthPage) {
      setIsLoading(false)
      return
    }
    
    // Skip if we already have cached data and already fetched this session
    if (cachedUser && hasFetched.current) {
      return
    }
    
    const getUser = async () => {
      hasFetched.current = true
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      cachedUser = user
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .single()
        
        setProfile(profileData)
        cachedProfile = profileData
      }
      setIsLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        cachedUser = session?.user ?? null
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('id', session.user.id)
            .single()
          setProfile(profileData)
          cachedProfile = profileData
        } else {
          setProfile(null)
          cachedProfile = null
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, isAuthPage])

  if (isAuthPage) {
    return null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/auth/login')
  }

  const handleNavigate = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  const displayName = profile?.nickname || user?.email?.split('@')[0] || 'Пользователь'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        {/* User Profile Section - clickable to go to profile settings */}
        {!isLoading && user && (
          <button
            onClick={() => handleNavigate('/profile')}
            className="w-full px-4 py-4 hover:bg-accent transition-colors"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
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
            onClick={() => handleNavigate('/favorites')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <Bookmark className="h-5 w-5 text-muted-foreground" />
            Избранные шаблоны
          </button>
          <button
            onClick={() => handleNavigate('/my-published')}
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
      </SheetContent>
    </Sheet>
  )
}
