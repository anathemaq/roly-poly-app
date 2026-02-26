'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, User } from 'lucide-react'

export default function ProfilePage() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single()

      if (profile) {
        setNickname(profile.nickname)
      }
      setIsLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ nickname: nickname.trim() })
      .eq('id', user.id)

    if (error) {
      setMessage({ type: 'error', text: 'Не удалось сохранить изменения' })
    } else {
      setMessage({ type: 'success', text: 'Профиль обновлен' })
    }
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-4" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      <Card className="bg-card/80 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Профиль</CardTitle>
              <CardDescription className="text-muted-foreground">
                Настройки вашего аккаунта
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted border-border text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">Email нельзя изменить</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nickname" className="text-foreground">Никнейм</Label>
            <Input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ваш никнейм"
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Отображается в сообществе при публикации шаблонов
            </p>
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'error' ? 'text-destructive' : 'text-green-500'}`}>
              {message.text}
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving || nickname.trim().length < 2}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSaving ? (
              'Сохранение...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
