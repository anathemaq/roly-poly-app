"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDay } from "@/lib/day-context"
import type { DayTemplate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Share2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTouchDrag } from "@/hooks/use-touch-drag"
import { useCommunityTemplates, TEMPLATE_CATEGORIES } from "@/lib/use-community-templates"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { templates, updateTemplate, addTemplate } = useDay()
  const [template, setTemplate] = useState<DayTemplate | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [durationInputs, setDurationInputs] = useState<Record<string, string>>({})
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishDescription, setPublishDescription] = useState("")
  const [publishCategory, setPublishCategory] = useState("other")
  const [isPublishing, setIsPublishing] = useState(false)
  const { publishTemplate } = useCommunityTemplates()
  const { toast } = useToast()

  const touchDrag = useTouchDrag({
    onReorder: (fromIndex, toIndex) => {
      if (!template) return
      const newActivities = [...template.activities]
      const draggedItem = newActivities[fromIndex]
      newActivities.splice(fromIndex, 1)
      newActivities.splice(toIndex, 0, draggedItem)

      setTemplate({
        ...template,
        activities: newActivities.map((a, i) => ({ ...a, order: i })),
      })
    },
  })

  useEffect(() => {
    if (params.id === "new") {
      setTemplate({
        id: Date.now().toString(),
        name: "",
        activities: [],
      })
      setDurationInputs({})
    } else {
      const found = templates.find((t) => t.id === params.id)
      if (found) {
        setTemplate(found)
        const inputs: Record<string, string> = {}
        found.activities.forEach((a) => {
          inputs[a.id] = a.duration.toString()
        })
        setDurationInputs(inputs)
      } else {
        router.push("/templates")
      }
    }
  }, [params.id, templates, router])

  if (!template) return null

  const handleSave = () => {
    if (!template.name.trim()) {
      alert("Введите название шаблона")
      return
    }
    if (template.activities.length === 0) {
      alert("Добавьте хотя бы одну активность")
      return
    }
    if (template.activities.some((a) => !a.name.trim())) {
      alert("Заполните названия всех активностей")
      return
    }

    if (params.id === "new") {
      addTemplate(template)
    } else {
      updateTemplate(template.id, template)
    }
    router.push("/templates")
  }

  const handlePublish = async () => {
    if (!template) return
    
    setIsPublishing(true)
    const result = await publishTemplate(
      template.name,
      publishDescription,
      template.activities.map((a) => ({
        name: a.name,
        duration: a.duration,
        color: a.color || "#9333ea",
      })),
      publishCategory
    )
    setIsPublishing(false)
    
    if (result) {
      setShowPublishDialog(false)
      setPublishDescription("")
      setPublishCategory("other")
      toast({
        title: "Шаблон опубликован",
        description: "Ваш шаблон теперь доступен в сообществе",
      })
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось опубликовать шаблон",
        variant: "destructive",
      })
    }
  }

  const handleAddActivity = () => {
    const newId = Date.now().toString()
    setTemplate({
      ...template,
      activities: [
        ...template.activities,
        {
          id: newId,
          name: "",
          duration: 30,
          order: template.activities.length,
        },
      ],
    })
    setDurationInputs({ ...durationInputs, [newId]: "30" })
  }

  const handleDeleteActivity = (id: string) => {
    setTemplate({
      ...template,
      activities: template.activities.filter((a) => a.id !== id).map((a, index) => ({ ...a, order: index })),
    })
    const newInputs = { ...durationInputs }
    delete newInputs[id]
    setDurationInputs(newInputs)
  }

  const handleUpdateActivity = (id: string, field: "name" | "duration", value: string | number) => {
    if (field === "duration") {
      setDurationInputs({ ...durationInputs, [id]: value.toString() })
      const numValue = Number(value)
      if (numValue > 0) {
        setTemplate({
          ...template,
          activities: template.activities.map((a) => (a.id === id ? { ...a, duration: numValue } : a)),
        })
      }
    } else {
      setTemplate({
        ...template,
        activities: template.activities.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
      })
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newActivities = [...template.activities]
    const draggedItem = newActivities[draggedIndex]
    newActivities.splice(draggedIndex, 1)
    newActivities.splice(index, 0, draggedItem)

    setTemplate({
      ...template,
      activities: newActivities.map((a, i) => ({ ...a, order: i })),
    })
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const totalDuration = template.activities.reduce((sum, a) => sum + a.duration, 0)
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="px-4 pb-4 flex items-center justify-between border-b border-border" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <Button variant="ghost" size="icon" onClick={() => router.push("/templates")} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">
          {params.id === "new" ? "Новый шаблон" : "Редактировать"}
        </h1>
        <div className="flex items-center gap-2">
          {params.id !== "new" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPublishDialog(true)}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={handleSave} size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Сохранить
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Template name input - Codewars style */}
        <div className="space-y-2">
          <Input
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            placeholder="Название шаблона..."
            className="text-lg font-semibold h-12 border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent"
          />
          {template.activities.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{template.activities.length} активностей</span>
              <span>•</span>
              <span>{hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`}</span>
            </div>
          )}
        </div>

        {/* Activities list */}
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Активности</h2>
          {template.activities.map((activity, index) => (
            <Card
              key={activity.id}
              ref={(el) => (itemRefs.current[index] = el)}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('input')) return
                touchDrag.handleTouchStart(e, index)
              }}
              onTouchMove={(e) => touchDrag.handleTouchMove(e, itemRefs.current.filter(Boolean) as HTMLElement[])}
              onTouchEnd={() => touchDrag.handleTouchEnd(index)}
              onTouchCancel={touchDrag.handleTouchCancel}
              className={cn(
                "p-3 transition-all cursor-grab active:cursor-grabbing",
                (draggedIndex === index || touchDrag.draggedIndex === index) && "opacity-50 scale-105",
                (touchDrag.dragOverIndex === index && touchDrag.draggedIndex !== index) && "border-primary border-2",
              )}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-2 flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Input
                    value={activity.name}
                    onChange={(e) => handleUpdateActivity(activity.id, "name", e.target.value)}
                    placeholder="Название активности"
                    className="text-sm h-8"
                    onTouchStart={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={durationInputs[activity.id] || ""}
                      onChange={(e) => handleUpdateActivity(activity.id, "duration", e.target.value)}
                      onBlur={(e) => {
                        const val = Number.parseInt(e.target.value)
                        if (!val || val < 1) {
                          setDurationInputs({ ...durationInputs, [activity.id]: "5" })
                          setTemplate({
                            ...template,
                            activities: template.activities.map((a) =>
                              a.id === activity.id ? { ...a, duration: 5 } : a,
                            ),
                          })
                        }
                      }}
                      min="1"
                      step="5"
                      className="w-16 h-7 text-xs"
                      onTouchStart={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-muted-foreground">мин</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteActivity(activity.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive flex-shrink-0"
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {/* Add activity button */}
          <button
            onClick={handleAddActivity}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-lg hover:border-primary/50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Добавить активность
          </button>
        </div>
      </main>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Опубликовать шаблон</DialogTitle>
            <DialogDescription>
              Поделитесь своим шаблоном с сообществом. Другие пользователи смогут скачать его и использовать.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Название</label>
              <Input value={template?.name || ""} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Категория</label>
              <Select value={publishCategory} onValueChange={setPublishCategory}>
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
              <label className="text-sm font-medium mb-2 block">Описание (необязательно)</label>
              <Textarea
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                placeholder="Опишите ваш шаблон..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Публикация...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Опубликовать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
