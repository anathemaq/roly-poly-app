"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useDay } from "@/lib/day-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Calendar, GripVertical, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTouchDrag } from "@/hooks/use-touch-drag"

export default function TimelineScreen() {
  const { currentActivities, updateActivity, reorderActivities } = useDay()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const timelineRef = useRef<HTMLDivElement>(null)
  
  const router = useRouter()

  const touchDrag = useTouchDrag({
    onReorder: (fromIndex, toIndex) => {
      const newActivities = [...currentActivities]
      const [draggedItem] = newActivities.splice(fromIndex, 1)
      newActivities.splice(toIndex, 0, draggedItem)
      reorderActivities(newActivities)
    },
  })

  // Упрощенный снап по часам
  const snapToHour = (hour: number) => {
    if (timelineRef.current) {
      const targetScrollTop = hour * 100 // Each hour is 100px
      timelineRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    }
  }

  const snapToCurrentTime = () => {
    if (timelineRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const targetScrollTop = currentHour * 100 + (currentMinute * 100) / 60
      timelineRef.current.scrollTo({
        top: targetScrollTop - timelineRef.current.clientHeight / 2 + 50,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (currentActivities.length > 0 && timelineRef.current) {
      const now = currentTime
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      
      // Calculate position: each hour = 100px, each minute = 100/60px
      const position = currentHour * 100 + (currentMinute * 100) / 60
      
      timelineRef.current.scrollTo({
        top: Math.max(0, position - 200), // Center current time
        behavior: 'smooth'
      })
    }
  }, [currentActivities.length, currentTime])

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newActivities = [...currentActivities]
      const [draggedItem] = newActivities.splice(draggedIndex, 1)
      newActivities.splice(dragOverIndex, 0, draggedItem)
      reorderActivities(newActivities)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleActivityClick = (activityId: string) => {
    setSelectedActivity(selectedActivity === activityId ? null : activityId)
  }

  const handleResizeStart = (activityId: string) => {
    setIsResizing(activityId)
  }

  const handleResizeEnd = () => {
    setIsResizing(null)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const getCurrentTimePosition = () => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    return currentHour * 100 + (currentMinute * 100) / 60
  }

  const getActivityPosition = (startTime: Date) => {
    const hour = startTime.getHours()
    const minute = startTime.getMinutes()
    return hour * 100 + (minute * 100) / 60
  }

  const getActivityHeight = (duration: number) => {
    return (duration / 60) * 100 // Convert minutes to pixels (100px per hour)
  }

  if (currentActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Нет активностей</h1>
          <p className="text-muted-foreground">
            Выберите шаблон дня, чтобы начать планирование
          </p>
          <Button onClick={() => router.push('/')} variant="outline">
            Выбрать шаблон
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="text-muted-foreground"
          >
            ← Назад
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Таймлайн</h1>
            <p className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={snapToCurrentTime}
            className="text-xs"
          >
            Сейчас
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Timeline */}
      <div className="flex-1 flex overflow-hidden">
        {/* Time Scale */}
        <div className="w-16 bg-muted/50 border-r flex flex-col">
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="h-[100px] border-b border-muted-foreground/20 flex items-center justify-center cursor-pointer hover:bg-muted-foreground/10 transition-colors"
              onClick={() => snapToHour(hour)}
            >
              <span className="text-xs font-mono text-muted-foreground">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Activities Track */}
        <div 
          ref={timelineRef}
          className="flex-1 overflow-y-auto relative"
          style={{ height: '2400px' }}
        >
          {/* Current Time Indicator */}
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${getCurrentTimePosition()}px` }}
          >
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-background shadow-sm" />
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          </div>

          {/* Activities */}
          {currentActivities.map((activity, index) => {
            const startTime = activity.startTime!
            const endTime = activity.endTime!
            const top = getActivityPosition(startTime)
            const height = getActivityHeight(activity.duration)
            const isSelected = selectedActivity === activity.id
            const isResizingThis = isResizing === activity.id

            // Адаптивное сжатие контента
            const minHeightForName = 12 // Just name
            const minHeightForTime = 20 // Name + time
            const minHeightForDuration = 28 // Name + time + duration
            const minHeightForFull = 40 // All content
            
            const showName = height >= minHeightForName
            const showTime = height >= minHeightForTime
            const showDuration = height >= minHeightForDuration
            const showFull = height >= minHeightForFull
            
            const isCompactView = height < minHeightForTime && height >= minHeightForName
            const isMiniView = height < minHeightForName

            return (
              <Card
                key={activity.id}
                ref={(el) => (itemRefs.current[index] = el)}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "absolute left-2 right-2 border-2 transition-all duration-200",
                  "h-full cursor-pointer transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-primary shadow-lg",
                  isResizingThis && "ring-2 ring-blue-500"
                )}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  zIndex: isSelected ? 10 : 1,
                }}
                onClick={() => handleActivityClick(activity.id)}
              >
                <div className="p-1 h-full flex flex-col justify-center overflow-hidden">
                  {isMiniView ? (
                    // Mini view: only icon
                    <div className="flex items-center justify-center h-full">
                      <GripVertical className="h-2 w-2 text-muted-foreground" />
                    </div>
                  ) : isCompactView ? (
                    // Compact view: only name
                    <div className="flex items-center gap-1 h-full">
                      <GripVertical className="h-2 w-2 text-muted-foreground flex-shrink-0" />
                      <h3 className="text-xs font-medium text-foreground truncate flex-1">
                        {activity.name}
                      </h3>
                    </div>
                  ) : showFull ? (
                    // Full view: all content
                    <>
                      <div className="flex items-center gap-1 mb-0.5">
                        <GripVertical className="h-2 w-2 text-muted-foreground flex-shrink-0" />
                        <h3 className="text-xs font-medium text-foreground truncate">
                          {activity.name}
                        </h3>
                      </div>
                      
                      <div className="text-[10px] text-muted-foreground truncate">
                        {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                      </div>
                      
                      <div className="text-[10px] font-medium text-primary truncate">
                        {Math.floor(activity.duration / 60)}ч {activity.duration % 60}м
                      </div>
                    </>
                  ) : (
                    // Progressive view: show content based on height
                    <>
                      {showName && (
                        <div className="flex items-center gap-1 mb-0.5">
                          <GripVertical className="h-2 w-2 text-muted-foreground flex-shrink-0" />
                          <h3 className="text-xs font-medium text-foreground truncate">
                            {activity.name}
                          </h3>
                        </div>
                      )}
                      
                      {showTime && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                        </div>
                      )}
                      
                      {showDuration && (
                        <div className="text-[10px] font-medium text-primary truncate">
                          {Math.floor(activity.duration / 60)}ч {activity.duration % 60}м
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Resize handles */}
                  {height > 20 && (
                    <>
                      <div
                        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent hover:bg-blue-500/20 transition-colors"
                        onMouseDown={() => handleResizeStart(activity.id)}
                        onMouseUp={handleResizeEnd}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize bg-transparent hover:bg-blue-500/20 transition-colors"
                        onMouseDown={() => handleResizeStart(activity.id)}
                        onMouseUp={handleResizeEnd}
                      />
                    </>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}