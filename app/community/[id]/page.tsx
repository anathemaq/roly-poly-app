"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Heart, Download, User, Trash2, Loader2, Pencil, Bookmark } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useCommunityTemplates, TEMPLATE_CATEGORIES } from "@/lib/use-community-templates"
import { useDay } from "@/lib/day-context"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface CommunityTemplate {
  id: string
  name: string
  description: string | null
  activities: Array<{ name: string; duration: number; color: string }>
  likes_count: number
  downloads_count: number
  user_id: string
  created_at: string
  category: string
  author: {
    nickname: string
  }
}

export default function CommunityTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { addTemplate } = useDay()
  const { userLikes, userFavorites, toggleLike, toggleFavorite, downloadTemplate, refresh } = useCommunityTemplates()
  
  const [template, setTemplate] = useState<CommunityTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCategory, setEditCategory] = useState("other")
  const [isSaving, setIsSaving] = useState(false)

  const isLiked = template ? userLikes.includes(template.id) : false
  const isFavorited = template ? userFavorites.includes(template.id) : false
  const isOwner = template && currentUserId === template.user_id

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const res = await fetch(`/api/community/templates/${params.id}`)
        if (!res.ok) throw new Error("Not found")
        const data = await res.json()
        setTemplate(data)
      } catch {
        toast({
          title: "Ошибка",
          description: "Шаблон не найден",
          variant: "destructive",
        })
        router.push("/templates")
      } finally {
        setIsLoading(false)
      }
    }

    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }

    fetchTemplate()
    fetchUser()
  }, [params.id, router, toast])

  const handleLike = async () => {
    if (!template) return
    setIsLikeLoading(true)
    await toggleLike(template.id)
    // Update local state
    setTemplate(prev => prev ? {
      ...prev,
      likes_count: prev.likes_count + (isLiked ? -1 : 1)
    } : null)
    setIsLikeLoading(false)
  }

  const handleDownload = async () => {
    if (!template) return
    setIsDownloading(true)
    const downloaded = await downloadTemplate(template.id)
    if (downloaded) {
      addTemplate({
        name: downloaded.name,
        activities: downloaded.activities,
      })
      setTemplate(prev => prev ? {
        ...prev,
        downloads_count: prev.downloads_count + 1
      } : null)
      toast({
        title: "Шаблон скачан",
        description: `"${downloaded.name}" добавлен в ваши шаблоны`,
      })
    }
    setIsDownloading(false)
  }

  const handleFavorite = async () => {
    if (!template) return
    await toggleFavorite(template.id)
  }

  const openEditDialog = () => {
    if (!template) return
    setEditName(template.name)
    setEditDescription(template.description || "")
    setEditCategory(template.category || "other")
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!template) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/community/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
          category: editCategory,
        }),
      })
      if (!res.ok) throw new Error("Failed to update")
      
      const updated = await res.json()
      setTemplate(prev => prev ? { ...prev, ...updated } : null)
      setShowEditDialog(false)
      refresh()
      toast({
        title: "Шаблон обновлен",
        description: "Изменения сохранены",
      })
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      })
    }
    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!template || !isOwner) return
    if (!confirm("Вы уверены, что хотите удалить этот шаблон из сообщества?")) return
    
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/community/templates/${template.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete")
      
      toast({
        title: "Шаблон удален",
        description: "Шаблон был удален из сообщества",
      })
      refresh()
      router.push("/templates")
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить шаблон",
        variant: "destructive",
      })
    }
    setIsDeleting(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!template) {
    return null
  }

  const totalDuration = template.activities.reduce((sum, a) => sum + a.duration, 0)
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header
        className="px-3 pb-3 flex items-center gap-3 border-b border-border"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground flex-1 truncate">
          {template.name}
        </h1>
        {isOwner && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={openEditDialog}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        {template.description && (
          <p className="text-muted-foreground">{template.description}</p>
        )}

        {/* Author */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <button
            onClick={() => router.push(`/author/${template.user_id}`)}
            className="hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            {template.author.nickname}
          </button>
          {isOwner && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Ваш шаблон
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{template.activities.length} активностей</span>
          <span>•</span>
          <span>
            {hours > 0 && `${hours}ч `}
            {minutes}м
          </span>
        </div>

        {/* Activity timeline preview */}
        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-muted">
          {template.activities.map((activity, index) => (
            <div
              key={index}
              className="h-full"
              style={{
                backgroundColor: activity.color,
                width: `${(activity.duration / totalDuration) * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Activities list */}
        <div className="space-y-2">
          <h2 className="font-semibold text-foreground">Активности</h2>
          {template.activities.map((activity, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: activity.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{activity.name}</p>
                </div>
                <span className="text-sm text-muted-foreground shrink-0">
                  {activity.duration} мин
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <button
            onClick={handleLike}
            disabled={isLikeLoading}
            className="flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
              )}
            />
            <span className={cn(isLiked ? "text-red-500" : "text-muted-foreground")}>
              {template.likes_count}
            </span>
          </button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Download className="h-4 w-4" />
            <span>{template.downloads_count}</span>
          </div>

          <button
            onClick={handleFavorite}
            className="flex items-center gap-2 text-sm transition-colors"
          >
            <Bookmark
              className={cn(
                "h-5 w-5 transition-colors",
                isFavorited ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
              )}
            />
          </button>
        </div>
      </main>

      {/* Download button */}
      <div
        className="fixed left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
      >
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Загрузка...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Скачать в мои шаблоны
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать шаблон</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Название</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Название шаблона"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Категория</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.filter(c => c.value !== 'all').map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Описание</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Опишите ваш шаблон..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
