"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Heart, Download, Bookmark, Eye, Clock, Activity } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  productivity: { label: "Продуктивность", color: "#22c55e" },
  sport: { label: "Спорт", color: "#f97316" },
  study: { label: "Учёба", color: "#3b82f6" },
  health: { label: "Здоровье", color: "#ec4899" },
  work: { label: "Работа", color: "#8b5cf6" },
  other: { label: "Другое", color: "#6b7280" },
}

interface TemplateKataCardProps {
  template: {
    id: string
    name: string
    description: string | null
    activities: Array<{ name: string; duration: number; color: string }>
    likes_count: number
    downloads_count: number
    user_id: string
    category?: string
    author: {
      nickname: string
    }
  }
  isLiked: boolean
  isFavorited: boolean
  onLike: (templateId: string) => void
  onFavorite: (templateId: string) => void
  onDownload: (templateId: string) => void
  isLikeLoading?: boolean
}

export function TemplateKataCard({
  template,
  isLiked,
  isFavorited,
  onLike,
  onFavorite,
  onDownload,
  isLikeLoading,
}: TemplateKataCardProps) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const totalDuration = template.activities.reduce((sum, a) => sum + a.duration, 0)
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60

  const category = CATEGORY_CONFIG[template.category || "other"] || CATEGORY_CONFIG.other

  const handleDownload = async () => {
    setIsDownloading(true)
    await onDownload(template.id)
    setIsDownloading(false)
  }

  const handleCardClick = () => {
    router.push(`/community/${template.id}`)
  }

  return (
    <>
      <div
        className="group relative flex cursor-pointer overflow-hidden rounded-lg bg-card hover:bg-card/80 transition-all duration-200 border border-border/50"
        onClick={handleCardClick}
      >
        {/* Category color indicator */}
        <div 
          className="w-1.5 shrink-0" 
          style={{ backgroundColor: category.color }}
        />

        <div className="flex-1 p-3 min-w-0">
          {/* Top row: Title and actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground leading-tight line-clamp-1">
                {template.name}
              </h3>
              {template.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {template.description}
                </p>
              )}
            </div>
            
            {/* Quick actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowPreview(true)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
                title="Просмотр"
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => onFavorite(template.id)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
                title="В избранное"
              >
                <Bookmark
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isFavorited ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <Link
              href={`/author/${template.user_id}`}
              className="hover:text-foreground hover:underline transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {template.author.nickname}
            </Link>
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {template.activities.length}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`}
            </span>
          </div>

          {/* Bottom row: Stats and category */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onLike(template.id)}
                disabled={isLikeLoading}
                className="flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
              >
                <Heart
                  className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"
                  )}
                />
                <span className={cn(isLiked ? "text-red-500" : "text-muted-foreground")}>
                  {template.likes_count}
                </span>
              </button>

              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Download className="h-3.5 w-3.5" />
                {template.downloads_count}
              </span>
            </div>

            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${category.color}20`,
                color: category.color 
              }}
            >
              {category.label}
            </span>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{template.name}</DialogTitle>
          </DialogHeader>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
          <div className="space-y-2 mt-4">
            <h4 className="font-medium text-sm">Активности ({template.activities.length})</h4>
            <div className="space-y-2">
              {template.activities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activity.color }}
                  />
                  <span className="flex-1 text-sm">{activity.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {activity.duration >= 60
                      ? `${Math.floor(activity.duration / 60)}ч ${activity.duration % 60}м`
                      : `${activity.duration}м`}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1"
              onClick={() => {
                handleDownload()
                setShowPreview(false)
              }}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Загрузка..." : "Скачать шаблон"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
