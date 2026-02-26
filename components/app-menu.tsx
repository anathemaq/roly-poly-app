'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, User, LogOut, Settings, Moon, Sun, Bookmark, Heart } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Profile {
  nickname: string
  avatar_url: string | null
}

export function AppMenu() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  const isAuthPage = pathname.startsWith('/auth')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isAuthPage) {
      setIsLoading(false)
      return
    }
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .single()
        
        setProfile(profileData)
      }
      setIsLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('id', session.user.id)
            .single()
          setProfile(profileData)
        } else {
          setProfile(null)
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
  const isDark = theme === 'dark'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left">Меню</SheetTitle>
        </SheetHeader>
        
        {/* User Profile Section */}
        {!isLoading && user && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={displayName}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Theme Toggle */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mounted && isDark ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">Темная тема</span>
            </div>
            {mounted && (
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Navigation Links */}
        <div className="py-2">
          <button
            onClick={() => handleNavigate('/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Настройки профиля
          </button>
          <button
            onClick={() => handleNavigate('/favorites')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <Bookmark className="h-4 w-4 text-muted-foreground" />
            Избранные шаблоны
          </button>
          <button
            onClick={() => handleNavigate('/my-published')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <Heart className="h-4 w-4 text-muted-foreground" />
            Мои публикации
          </button>
        </div>
        
        <Separator />
        
        {/* Logout */}
        <div className="py-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
