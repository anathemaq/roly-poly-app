"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDay } from "@/lib/day-context"
import type { DayTemplate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Trash2, GripVertical, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTouchDrag } from "@/hooks/use-touch-drag"

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { templates, updateTemplate, addTemplate } = useDay()
  const [template, setTemplate] = useState<DayTemplate | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [durationInputs, setDurationInputs] = useState<Record<string, string>>({})
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

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
      <header className="p-4 flex items-center justify-between border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.push("/templates")} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">
          {params.id === "new" ? "Новый шаблон" : "Редактировать"}
        </h1>
        <Button onClick={handleSave} size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Сохранить
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Template name input */}
        <Card className="p-4">
          <label className="text-sm font-medium text-foreground mb-2 block">Название шаблона</label>
          <Input
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            placeholder="Например: Рабочий день"
            className="text-base"
          />
          {template.activities.length > 0 && (
            <div className="mt-3 text-sm text-muted-foreground">
              {template.activities.length} активностей • {hours > 0 && `${hours}ч `}
              {minutes}м
            </div>
          )}
        </Card>

        {/* Activities list */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-foreground px-1">Активности</h2>
          {template.activities.map((activity, index) => (
            <Card
              key={activity.id}
              ref={(el) => (itemRefs.current[index] = el)}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => touchDrag.handleTouchStart(e, index)}
              onTouchMove={(e) => touchDrag.handleTouchMove(e, itemRefs.current.filter(Boolean) as HTMLElement[])}
              onTouchEnd={() => touchDrag.handleTouchEnd(index)}
              onTouchCancel={touchDrag.handleTouchCancel}
              className={cn(
                "p-3 cursor-move touch-none",
                (draggedIndex === index || touchDrag.draggedIndex === index) && "opacity-50 scale-105",
              )}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2 flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <Input
                    value={activity.name}
                    onChange={(e) => handleUpdateActivity(activity.id, "name", e.target.value)}
                    placeholder="Название активности"
                    className="text-base"
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
                      className="w-20 text-base"
                    />
                    <span className="text-sm text-muted-foreground">минут</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteActivity(activity.id)}
                  className="h-9 w-9 text-destructive hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {/* Add activity button */}
          <Button variant="outline" onClick={handleAddActivity} className="w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Добавить активность
          </Button>
        </div>
      </main>
    </div>
  )
}
