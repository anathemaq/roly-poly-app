"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Download, User, Bookmark, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface CommunityTemplateCardProps {
  template: {
    id: string
    name: string
    description: string | null
    activities: Array<{ name: string; duration: number; color: string }>
    likes_count: number
    downloads_count: number
    user_id: string
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

export function CommunityTemplateCard({
  template,
  isLiked,
  isFavorited,
  onLike,
  onFavorite,
  onDownload,
  isLikeLoading,
}: CommunityTemplateCardProps) {
  const router = useRouter()
  const [isDownloading, setIsDownloading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const totalDuration = template.activities.reduce((sum, a) => sum + a.duration, 0)
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60

  const handleDownload = async () => {
    setIsDownloading(true)
    await onDownload(template.id)
    setIsDownloading(false)
  }

  const handleCardClick = () => {
    router.push(`/community/${template.id}`)
  }

  return (
    <Card 
      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={handleCardClick}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg leading-tight">
              {template.name}
            </h3>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
        </div>

        {/* Author */}
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/author/${template.user_id}`)
          }}
        >
          <User className="h-4 w-4" />
          <span className="underline-offset-2 hover:underline">{template.author.nickname}</span>
        </button>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{template.activities.length} активностей</span>
          <span>
            {hours > 0 && `${hours}ч `}
            {minutes}м
          </span>
        </div>

        {/* Activity preview */}
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
          {template.activities.slice(0, 8).map((activity, index) => (
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLike(template.id)
              }}
              disabled={isLikeLoading}
              className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50"
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

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Download className="h-4 w-4" />
              <span>{template.downloads_count}</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onFavorite(template.id)
              }}
              className="flex items-center gap-1.5 text-sm transition-colors"
            >
              <Bookmark
                className={cn(
                  "h-5 w-5 transition-colors",
                  isFavorited ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                )}
              />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowPreview(true)
              }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload()
            }}
            disabled={isDownloading}
          >
            {isDownloading ? "Загрузка..." : "Скачать"}
          </Button>
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
              {isDownloading ? "Загрузка..." : "Скачать шаблон"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
