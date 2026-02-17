"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useDay } from "@/lib/day-context"
import type { Activity } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Pause, Play, SkipForward, GripVertical, Timer } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTouchDrag } from "@/hooks/use-touch-drag"
import { CircularTimer } from "@/components/circular-timer"

export default function TodayScreen() {
  const {
    currentActivities,
    updateActivity,
    getCurrentActivity,
    skipActivity,
    pauseSchedule,
    resumeSchedule,
    reorderActivities,
    pomodoroCompletedSessions,
  } = useDay()
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isPaused, setIsPaused] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [editForm, setEditForm] = useState({ name: "", duration: 0, startTime: "" })
  const [durationInput, setDurationInput] = useState("")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const router = useRouter()
  const [isDragOperation, setIsDragOperation] = useState(false)

  const touchDrag = useTouchDrag({
    onReorder: (fromIndex, toIndex) => {
      const reordered = [...currentActivities]
      const [draggedItem] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, draggedItem)
      reorderActivities(reordered)
    },
    onTap: (index) => {
      // Single tap opens edit dialog
      const activity = currentActivities[index]
      openEditDialog(activity)
    },
    longPressDuration: 250,
  })

  // Отключаем скролл страницы во время перетаскивания (мышь или тач)
  const isTouchDragging = touchDrag.draggedIndex !== null
  useEffect(() => {
    const lock = isDragOperation || isTouchDragging
    if (lock) {
      const prevBodyOverflow = document.body.style.overflow
      const prevHtmlOverflow = document.documentElement.style.overflow
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      // overscroll-behavior предотвращает резинку на мобильных
      const prevBodyOverscroll = (document.body.style as any).overscrollBehavior
      const prevHtmlOverscroll = (document.documentElement.style as any).overscrollBehavior
      ;(document.body.style as any).overscrollBehavior = "none"
      ;(document.documentElement.style as any).overscrollBehavior = "none"
      return () => {
        document.body.style.overflow = prevBodyOverflow
        document.documentElement.style.overflow = prevHtmlOverflow
        ;(document.body.style as any).overscrollBehavior = prevBodyOverscroll
        ;(document.documentElement.style as any).overscrollBehavior = prevHtmlOverscroll
      }
    }
  }, [isDragOperation, isTouchDragging])

  useEffect(() => {
    const updateCurrent = () => {
      const current = getCurrentActivity()
      setCurrentActivity(current)

      if (current && current.endTime && !isPaused) {
        const now = new Date()
        const remaining = Math.max(0, current.endTime.getTime() - now.getTime())
        setTimeRemaining(remaining)
      }
    }

    updateCurrent()
    const interval = setInterval(updateCurrent, 1000)
    return () => clearInterval(interval)
  }, [getCurrentActivity, currentActivities, isPaused])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const formatTimeRange = (start?: Date, end?: Date) => {
    if (!start || !end) return ""
    return `${start.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`
  }

  const getProgress = () => {
    if (!currentActivity || !currentActivity.startTime || !currentActivity.endTime) return 0
    const total = currentActivity.endTime.getTime() - currentActivity.startTime.getTime()
    const elapsed = total - timeRemaining
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  const handleToggleComplete = (id: string, completed: boolean) => {
    updateActivity(id, { completed })
  }

  const handleLongPress = (activity: Activity) => {
    setEditingActivity(activity)
    setDurationInput(activity.duration.toString())
    setEditForm({
      name: activity.name,
      duration: activity.duration,
      startTime: activity.startTime
        ? `${activity.startTime.getHours().toString().padStart(2, "0")}:${activity.startTime.getMinutes().toString().padStart(2, "0")}`
        : "",
    })
  }

  const handleSaveEdit = () => {
    if (!editingActivity) return

    const [hours, minutes] = editForm.startTime.split(":").map(Number)
    const newStartTime = new Date(editingActivity.startTime!)
    newStartTime.setHours(hours, minutes, 0, 0)

    const duration = Number.parseInt(durationInput) || 5

    updateActivity(editingActivity.id, {
      name: editForm.name,
      duration: duration,
      startTime: newStartTime,
    })

    setEditingActivity(null)
  }

  const handlePause = () => {
    if (isPaused) {
      resumeSchedule()
      setIsPaused(false)
    } else {
      pauseSchedule()
      setIsPaused(true)
    }
  }

  const handleSkip = () => {
    if (currentActivity) {
      skipActivity(currentActivity.id)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
    setIsDragOperation(true)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...currentActivities]
    const [draggedItem] = reordered.splice(draggedIndex, 1)
    reordered.splice(dropIndex, 0, draggedItem)

    reorderActivities(reordered)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
    setTimeout(() => setIsDragOperation(false), 100)
  }

  const openEditDialog = (activity: Activity) => {
    setEditingActivity(activity)
    setDurationInput(activity.duration.toString())
    setEditForm({
      name: activity.name,
      duration: activity.duration,
      startTime: activity.startTime
        ? `${activity.startTime.getHours().toString().padStart(2, "0")}:${activity.startTime.getMinutes().toString().padStart(2, "0")}`
        : "",
    })
  }

  const handleCardClick = (activity: Activity, e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    if (
      t.closest('[data-checkbox]') ||
      t.closest('[role="checkbox"]') ||
      t.closest('input[type="checkbox"]') ||
      t.closest('button') ||
      t.closest('svg')
    ) {
      return
    }

    if (isDragOperation) {
      return
    }

    openEditDialog(activity)
  }

  const completedCount = currentActivities.filter((a) => a.completed).length
  const totalCount = currentActivities.length
  const remainingCount = totalCount - completedCount
  const completedMinutes = currentActivities
    .filter((a) => a.completed)
    .reduce((sum, a) => sum + a.duration, 0)
  const totalMinutes = currentActivities.reduce((sum, a) => sum + a.duration, 0)
  const dayProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  if (currentActivities.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 text-center space-y-4 max-w-md">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">День не начат</h2>
          <p className="text-muted-foreground">Вернитесь на главный экран и выберите шаблон дня</p>
          <Button onClick={() => router.push("/")} className="w-full">
            На главную
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-3 flex justify-between items-center border-b border-border">
        <h1 className="text-base font-semibold text-foreground">
          {useDay().currentTemplate?.name ?? "Сегодня"}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {completedCount} / {totalCount}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Current Activity Section */}
      {currentActivity && (
        <div className="p-4 space-y-3 border-b border-border bg-card/50">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">{currentActivity.name}</h2>
            <p className="text-xs text-muted-foreground">
              {formatTimeRange(currentActivity.startTime, currentActivity.endTime)}
            </p>
          </div>

          <div className="flex justify-center">
            <CircularTimer
              totalDuration={
                currentActivity?.startTime && currentActivity?.endTime
                  ? currentActivity.endTime.getTime() - currentActivity.startTime.getTime()
                  : 1
              }
              remaining={timeRemaining}
              progress={getProgress()}
              formattedTime={formatTime(timeRemaining)}
              label="осталось"
              size={160}
              draggable={!!currentActivity && !isPaused}
              onDurationCommit={(newRemainingMs) => {
                if (!currentActivity) return
                // Adjust the activity's endTime based on drag
                const newDurationMs = (currentActivity.endTime!.getTime() - currentActivity.startTime!.getTime()) - (timeRemaining - newRemainingMs)
                const newDurationMin = Math.max(5, Math.round(newDurationMs / 60000))
                updateActivity(currentActivity.id, { duration: newDurationMin })
              }}
            />
          </div>

          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePause}
              className="rounded-full h-12 w-12 bg-transparent"
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSkip}
              className="rounded-full h-12 w-12 bg-transparent"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>
        </div>
        )}

        {/* Day Stats */}
        <div className="px-4 py-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Прогресс дня</span>
            <span>{Math.round(dayProgress)}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${dayProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-green-500">{completedCount} выполнено</span>
            <span className="text-muted-foreground">{remainingCount} осталось</span>
            <span className="text-muted-foreground">
              {Math.floor(completedMinutes / 60) > 0 && `${Math.floor(completedMinutes / 60)}ч `}
              {completedMinutes % 60}м / {Math.floor(totalMinutes / 60) > 0 && `${Math.floor(totalMinutes / 60)}ч `}
              {totalMinutes % 60}м
            </span>
          </div>
          {pomodoroCompletedSessions > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" />
              <span>Pomodoro: {pomodoroCompletedSessions} {pomodoroCompletedSessions === 1 ? "сессия" : pomodoroCompletedSessions < 5 ? "сессии" : "сессий"}</span>
            </div>
          )}
        </div>

        <main
        className={cn(
          "flex-1 p-3 space-y-2",
          (isDragOperation || isTouchDragging) ? "overflow-hidden touch-none" : "overflow-y-auto",
        )}
      >
        <h3 className="text-xs font-medium text-muted-foreground px-2 mb-2">Расписание дня</h3>
        {currentActivities.map((activity, index) => {
          const isCurrent = currentActivity?.id === activity.id
          const duration = activity.duration
          const hours = Math.floor(duration / 60)
          const minutes = duration % 60
          const durationText = hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`

          return (
            <Card
              key={activity.id}
              ref={(el) => (itemRefs.current[index] = el)}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleCardClick(activity, e)}
              onPointerDown={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('[data-checkbox], [role="checkbox"], input[type="checkbox"], button, .checkbox')) {
                  e.stopPropagation()
                }
              }}
              onTouchStart={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('[data-checkbox], [role="checkbox"], input[type="checkbox"], button, .checkbox')) return
                touchDrag.handleTouchStart(e, index)
              }}
              onTouchMove={(e) => touchDrag.handleTouchMove(e, itemRefs.current.filter(Boolean) as HTMLElement[])}
              onTouchEnd={() => touchDrag.handleTouchEnd(index)}
              onTouchCancel={touchDrag.handleTouchCancel}
              className={cn(
                "p-3 transition-all cursor-pointer",
                isCurrent && "ring-2 ring-primary bg-card",
                activity.completed && "opacity-60",
                (draggedIndex === index || touchDrag.draggedIndex === index) && "opacity-50 scale-105",
                (dragOverIndex === index || touchDrag.dragOverIndex === index) && "border-primary border-2",
              )}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                <Checkbox
                  checked={activity.completed}
                  onCheckedChange={(checked) => handleToggleComplete(activity.id, checked as boolean)}
                  className="mt-0.5"
                  data-checkbox
                  onClick={(e) => { e.stopPropagation() }}
                  onPointerDown={(e) => { e.stopPropagation() }}
                  onTouchStart={(e) => { e.stopPropagation() }}
                  onTouchEnd={(e) => { e.stopPropagation() }}
                />
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      "text-sm font-medium text-foreground",
                      activity.completed && "line-through text-muted-foreground",
                    )}
                  >
                    {activity.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{formatTimeRange(activity.startTime, activity.endTime)}</span>
                    <span className="text-[10px]">• {durationText}</span>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </main>

      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать активность</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Длительность (минуты)</Label>
              <Input
                id="duration"
                type="number"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                onBlur={(e) => {
                  const val = Number.parseInt(e.target.value)
                  if (!val || val < 1) {
                    setDurationInput("5")
                  }
                }}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Время начала</Label>
              <Input
                id="startTime"
                type="time"
                value={editForm.startTime}
                onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
