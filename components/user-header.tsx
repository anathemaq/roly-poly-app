'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User, LogOut, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Profile {
  nickname: string
  avatar_url: string | null
}

export function UserHeader() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Don't render on auth pages
  if (pathname.startsWith('/auth')) {
    return null
  }

  useEffect(() => {
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
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-card/50 border-b border-border">
        <div className="h-5 w-24 bg-muted animate-pulse rounded" />
        <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = profile?.nickname || user.email?.split('@')[0] || 'Пользователь'

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card/50 border-b border-border">
      <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
        {displayName}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <Settings className="mr-2 h-4 w-4" />
            Настройки профиля
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
