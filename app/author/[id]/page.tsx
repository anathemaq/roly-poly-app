"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Heart, Download, User, Calendar, Loader2 } from "lucide-react"


interface AuthorProfile {
  id: string
  nickname: string
  avatar_url: string | null
  created_at: string
  totalLikes: number
  totalDownloads: number
  templatesCount: number
}

interface AuthorTemplate {
  id: string
  name: string
  description: string | null
  activities: { name: string; duration: number; color: string }[]
  likes_count: number
  downloads_count: number
  category: string
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  productivity: 'Продуктивность',
  sport: 'Спорт',
  study: 'Учёба',
  health: 'Здоровье',
  work: 'Работа',
  other: 'Другое',
}

export default function AuthorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<AuthorProfile | null>(null)
  const [templates, setTemplates] = useState<AuthorTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const authorId = params.id as string
    if (!authorId) {
      setIsLoading(false)
      return
    }

    async function fetchAuthor() {
      try {
        const res = await fetch(`/api/community/authors/${authorId}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setProfile(data.profile)
        setTemplates(data.templates)
      } catch (error) {
        console.error('Failed to fetch author:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAuthor()
  }, [params.id, mounted])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Автор не найден</p>
        <Button variant="outline" onClick={() => router.back()}>
          Назад
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header
        className="px-4 pb-4 border-b border-border"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>

        {/* Profile Info */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.nickname}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{profile.nickname}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(profile.created_at).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{profile.templatesCount}</p>
            <p className="text-xs text-muted-foreground">Шаблонов</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
              <Heart className="h-4 w-4 text-red-500" />
              {profile.totalLikes}
            </p>
            <p className="text-xs text-muted-foreground">Лайков</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
              <Download className="h-4 w-4 text-blue-500" />
              {profile.totalDownloads}
            </p>
            <p className="text-xs text-muted-foreground">Скачиваний</p>
          </div>
        </div>
      </header>

      {/* Templates */}
      <main className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Шаблоны автора</h2>
        
        {templates.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Пока нет опубликованных шаблонов
          </p>
        ) : (
          templates.map((template) => {
            const totalDuration = template.activities.reduce((sum, a) => sum + a.duration, 0)
            const hours = Math.floor(totalDuration / 60)
            const minutes = totalDuration % 60

            return (
              <Card
                key={template.id}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => router.push(`/community/${template.id}`)}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground">{template.name}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {CATEGORY_LABELS[template.category] || template.category}
                    </span>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {template.activities.length} активностей
                      {' • '}
                      {hours > 0 && `${hours}ч `}{minutes}м
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {template.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {template.downloads_count}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </main>
    </div>
  )
}
