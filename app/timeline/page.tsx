"use client"

import type React from "react"

import { useEffect, useState, useRef, useCallback } from "react"
import { useDay } from "@/lib/day-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Calendar, GripVertical, Clock, Undo2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTouchDrag } from "@/hooks/use-touch-drag"
import { IOSPicker } from "@/components/ios-picker"

export default function TimelineScreen() {
  const { currentActivities, updateActivity, reorderActivities } = useDay()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom'>('bottom')
  const resizeOffsetRef = useRef<number>(0)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const timelineRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Undo history - store snapshots of activities
  const [undoStack, setUndoStack] = useState<any[]>([])
  const saveSnapshot = useCallback(() => {
    const snapshot = currentActivities.map(a => ({
      ...a,
      startTime: a.startTime ? new Date(a.startTime.getTime()) : undefined,
      endTime: a.endTime ? new Date(a.endTime.getTime()) : undefined,
    }))
    setUndoStack(prev => [...prev.slice(-19), snapshot]) // keep last 20
  }, [currentActivities])

  const undo = useCallback(() => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(s => s.slice(0, -1))
    reorderActivities(prev)
  }, [undoStack, reorderActivities])

  const touchDrag = useTouchDrag({
    onReorder: (fromIndex, toIndex) => {
      const newActivities = [...currentActivities]
      const [draggedItem] = newActivities.splice(fromIndex, 1)
      newActivities.splice(toIndex, 0, draggedItem)
      reorderActivities(newActivities)
    },
  })

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

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return

    const newActivities = [...currentActivities]
    const [draggedItem] = newActivities.splice(draggedIndex, 1)
    newActivities.splice(index, 0, draggedItem)

    reorderActivities(newActivities)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDurationChange = (id: string, change: number) => {
    const activity = currentActivities.find((a) => a.id === id)
    if (!activity) return

    const newDuration = Math.max(15, activity.duration + change) // Minimum 15 minutes
    updateActivity(id, { duration: newDuration })
  }

  const formatTime = (date?: Date) => {
    if (!date || isNaN(date.getTime())) return ""
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
  }

  const getActivityPosition = (activity: any) => {
    if (!activity.startTime) return 0
    
    const startHour = activity.startTime.getHours()
    const startMinute = activity.startTime.getMinutes()
    
    // Each hour = 100px, each minute = 100/60px
    return startHour * 100 + (startMinute * 100) / 60
  }

  // Drag-move state for activity blocks (not resize)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffsetRef = useRef<number>(0)

    const handleBlockDragStart = (activityId: string, e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      const activity = currentActivities.find(a => a.id === activityId)
      if (!activity || !timelineRef.current) return
      saveSnapshot()

    const clientY = 'nativeEvent' in e && 'touches' in (e as any).nativeEvent && (e as any).nativeEvent.touches?.length
      ? (e as any).nativeEvent.touches[0].clientY
      : (e as React.MouseEvent).clientY

    const timelineRect = timelineRef.current.getBoundingClientRect()
    const scrollTop = timelineRef.current.scrollTop
    const activityTopPx = getActivityPosition(activity)
    dragOffsetRef.current = clientY - timelineRect.top + scrollTop - activityTopPx

    setDraggingId(activityId)

    // Block scroll during drag
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }

  const handleBlockDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingId || !timelineRef.current) return
    e.preventDefault()

    const activity = currentActivities.find(a => a.id === draggingId)
    if (!activity || !activity.startTime) return

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const timelineRect = timelineRef.current.getBoundingClientRect()
      const scrollTop = timelineRef.current.scrollTop
      const relativeY = clientY - timelineRect.top + scrollTop
      const targetTopPx = relativeY - dragOffsetRef.current

    const totalMinutes = 24 * 60
    const pxToMinutes = (px: number) => Math.round((px * 60) / 100)
    let newStartMinutes = pxToMinutes(targetTopPx)
    // Round to 5 minutes grid
    newStartMinutes = Math.round(newStartMinutes / 5) * 5
    // Clamp so block stays within day
    newStartMinutes = Math.max(0, Math.min(totalMinutes - activity.duration, newStartMinutes))

    const base = new Date(activity.startTime)
    base.setHours(0, 0, 0, 0)
    base.setMinutes(newStartMinutes, 0, 0)

    updateActivity(activity.id, { startTime: base })
  }, [draggingId, currentActivities, updateActivity])

  const handleBlockDragEnd = useCallback(() => {
    if (!draggingId) return
    setDraggingId(null)
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }, [draggingId])

  useEffect(() => {
    if (draggingId) {
      document.addEventListener('mousemove', handleBlockDragMove as any, { passive: false })
      document.addEventListener('mouseup', handleBlockDragEnd as any)
      document.addEventListener('touchmove', handleBlockDragMove as any, { passive: false })
      document.addEventListener('touchend', handleBlockDragEnd as any)
      return () => {
        document.removeEventListener('mousemove', handleBlockDragMove as any)
        document.removeEventListener('mouseup', handleBlockDragEnd as any)
        document.removeEventListener('touchmove', handleBlockDragMove as any)
        document.removeEventListener('touchend', handleBlockDragEnd as any)
      }
    }
  }, [draggingId, handleBlockDragMove, handleBlockDragEnd])

  const getActivityHeight = (activity: any) => {
    // Each minute = 100/60px height, minimum 30px to prevent overlap
    return Math.max(30, (activity.duration * 100) / 60)
  }

  const getCurrentTimePosition = () => {
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    
    return currentHour * 100 + (currentMinute * 100) / 60
  }

  const handleActivityClick = (activityId: string) => {
    setSelectedActivity(selectedActivity === activityId ? null : activityId)
  }

    const handleResizeStart = (activityId: string, edge: 'top' | 'bottom', e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      e.preventDefault()

      const activity = currentActivities.find(a => a.id === activityId)
      if (!activity || !timelineRef.current) return
      saveSnapshot()

    const clientY = 'nativeEvent' in e && 'touches' in (e as any).nativeEvent && (e as any).nativeEvent.touches?.length
      ? (e as any).nativeEvent.touches[0].clientY
      : (e as React.MouseEvent).clientY

    const timelineRect = timelineRef.current.getBoundingClientRect()
    const scrollTop = timelineRef.current.scrollTop
    const activityTopPx = getActivityPosition(activity)
    const activityBottomPx = activityTopPx + getActivityHeight(activity)

    if (edge === 'top') {
      resizeOffsetRef.current = clientY - timelineRect.top + scrollTop - activityTopPx
    } else {
      resizeOffsetRef.current = clientY - timelineRect.top + scrollTop - activityBottomPx
    }

    setResizeEdge(edge)
    setIsResizing(activityId)
    
    // Block scroll during resize
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }

  const handleResize = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizing) return
    
    // Prevent default to stop scrolling
    e.preventDefault()
    
    const activity = currentActivities.find(a => a.id === isResizing)
    if (!activity || !activity.startTime) return

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const timelineRect = timelineRef.current?.getBoundingClientRect()
    if (!timelineRect || !timelineRef.current) return

    const scrollTop = timelineRef.current.scrollTop
    const relativeY = clientY - timelineRect.top + scrollTop - resizeOffsetRef.current
    const pxToMinutes = (px: number) => Math.round((px * 60) / 100 / 5) * 5 // snap to 5 min

    if (resizeEdge === 'bottom') {
      // Bottom edge: change duration, keep startTime
      const activityTopPx = getActivityPosition(activity)
      const newDurationMinutes = pxToMinutes(relativeY - activityTopPx)
      updateActivity(activity.id, { duration: Math.max(5, newDurationMinutes) })
    } else {
      // Top edge: change startTime, adjust duration to keep endTime
      const activityBottomPx = getActivityPosition(activity) + getActivityHeight(activity)
      const newTopMinutes = pxToMinutes(relativeY)
      const clampedTop = Math.max(0, Math.min(newTopMinutes, 24 * 60 - 5))
      const oldEndMinutes = activity.startTime.getHours() * 60 + activity.startTime.getMinutes() + activity.duration
      const newDuration = oldEndMinutes - clampedTop

      if (newDuration >= 5) {
        const newStart = new Date(activity.startTime)
        newStart.setHours(0, 0, 0, 0)
        newStart.setMinutes(clampedTop, 0, 0)
        updateActivity(activity.id, { startTime: newStart, duration: newDuration })
      }
    }
  }, [isResizing, resizeEdge, currentActivities, updateActivity])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(null)
    
    // Restore scroll after resize
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize, { passive: false })
      document.addEventListener('mouseup', handleResizeEnd)
      document.addEventListener('touchmove', handleResize, { passive: false })
      document.addEventListener('touchend', handleResizeEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleResize)
        document.removeEventListener('mouseup', handleResizeEnd)
        document.removeEventListener('touchmove', handleResize)
        document.removeEventListener('touchend', handleResizeEnd)
      }
    }
  }, [isResizing, handleResize, handleResizeEnd])

  // Generate time scale (24 hours)
  const timeScale = Array.from({ length: 24 }, (_, i) => i)

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
        <h1 className="text-base font-semibold text-foreground">Таймлайн</h1>
        <ThemeToggle />
      </header>

      {/* Timeline */}
      <main className="flex-1 overflow-y-auto" ref={timelineRef}>
        <div className="flex">
          {/* Time Scale */}
          <div className="w-12 bg-muted/30 border-r border-border flex-shrink-0">
            <div className="relative h-[2400px]"> {/* 24 hours * 100px */}
              {timeScale.map((hour) => (
                <div key={hour} className="absolute w-full" style={{ top: `${hour * 100}px` }}>
                  <div className="flex items-center h-6 px-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                  
                  {/* Minute marks */}
                  {[15, 30, 45].map((minute) => (
                    <div
                      key={minute}
                      className="absolute w-1.5 h-px bg-border"
                      style={{ 
                        top: `${(minute * 100) / 60}px`,
                        left: '9px'
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Activities Track */}
          <div 
            className="flex-1 relative"
            style={{ height: '2400px' }} // 24 hours * 100px
          >
            {/* Current Time Indicator */}
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${getCurrentTimePosition()}px` }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="flex-1 h-0.5 bg-primary" />
                <span className="text-xs font-medium text-primary ml-2 bg-background px-1 rounded">
                  {formatTime(currentTime)}
                </span>
              </div>
            </div>

            {/* Activities */}
            {currentActivities.map((activity, index) => {
              const position = getActivityPosition(activity)
              const height = getActivityHeight(activity)
              const isSelected = selectedActivity === activity.id
              const isResizingThis = isResizing === activity.id
              
              // Calculate minimum height for different content levels
              const minHeightForName = 15 // Just name
              const minHeightForTime = 25 // Name + time
              const minHeightForDuration = 35 // Name + time + duration
              
              // Determine what content to show based on height
              const showTime = height >= minHeightForTime
              const showDuration = height >= minHeightForDuration
              const showName = height >= minHeightForName
              
              // For compact view: when duration < 60 minutes (100px height)
              const isCompactView = activity.duration < 60 && height >= minHeightForName

              return (
                <div
                  key={activity.id}
                  className="absolute left-0 right-0 z-10"
                  style={{ 
                    top: `${position}px`,
                    height: `${height}px`
                  }}
                >
                    <Card
                      className={cn(
                        "h-full cursor-pointer transition-all hover:shadow-md relative overflow-visible",
                        isSelected && "ring-2 ring-primary shadow-lg",
                        isResizingThis && "ring-2 ring-blue-500"
                      )}
                      onClick={() => handleActivityClick(activity.id)}
                      onMouseDown={(e) => handleBlockDragStart(activity.id, e)}
                      onTouchStart={(e) => handleBlockDragStart(activity.id, e)}
                    >
                      <div className="p-1 h-full flex flex-col justify-center overflow-hidden">
                        {isCompactView ? (
                          // Compact view: everything in one line
                          <div className="flex items-center gap-1">
                            <GripVertical className="h-2 w-2 text-muted-foreground flex-shrink-0" />
                            <h3 className="text-xs font-medium text-foreground truncate flex-1">
                              {activity.name}
                            </h3>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatTime(activity.startTime)}-{formatTime(activity.endTime)}
                            </div>
                            <div className="text-[10px] font-medium text-primary whitespace-nowrap ml-1">
                              {Math.floor(activity.duration / 60)}ч{activity.duration % 60}м
                            </div>
                          </div>
                        ) : (
                          // Normal view: stacked content
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
                      </div>

                      {/* Resize handles - outside overflow-hidden content div */}
                      <div
                        className="absolute top-0 left-0 right-0 h-4 cursor-ns-resize bg-transparent hover:bg-primary/20 z-10"
                        onMouseDown={(e) => handleResizeStart(activity.id, 'top', e)}
                        onTouchStart={(e) => handleResizeStart(activity.id, 'top', e)}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize bg-transparent hover:bg-primary/20 z-10"
                        onMouseDown={(e) => handleResizeStart(activity.id, 'bottom', e)}
                        onTouchStart={(e) => handleResizeStart(activity.id, 'bottom', e)}
                      />
                    </Card>
                </div>
              )
            })}
          </div>
        </div>
      </main>

        {/* Floating Undo Button */}
        {undoStack.length > 0 && (
          <button
            onClick={undo}
            className="fixed bottom-20 right-4 z-30 w-10 h-10 rounded-full bg-muted/80 backdrop-blur-sm border border-border shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            <Undo2 className="h-4 w-4 text-foreground" />
          </button>
        )}

        {/* Activity Info Popup */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6 bg-background">
            {(() => {
              const activity = currentActivities.find(a => a.id === selectedActivity)
              if (!activity) return null
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold">{activity.name}</h3>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Начало:</span>
                      <input
                        type="time"
                        value={activity.startTime ? activity.startTime.toTimeString().slice(0, 5) : ''}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(':').map(Number)
                          const newStartTime = new Date(activity.startTime!)
                          newStartTime.setHours(hours, minutes, 0, 0)
                          updateActivity(activity.id, { startTime: newStartTime })
                        }}
                        className="px-2 py-1 border border-border rounded text-sm"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <span className="text-muted-foreground">Длительность (минуты):</span>
                      <div className="w-full">
                        <IOSPicker
                          options={Array.from({ length: 58 }, (_, i) => ({
                            value: `${(i + 1) * 5}`,
                            label: `${(i + 1) * 5} мин`
                          }))}
                          value={`${activity.duration}`}
                          onChange={(val) => {
                            const newDuration = parseInt(val)
                            updateActivity(activity.id, { duration: newDuration })
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Окончание:</span>
                      <span>{formatTime(activity.endTime)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedActivity(null)}
                      className="ml-auto"
                    >
                      Закрыть
                    </Button>
                  </div>
                </div>
              )
            })()}
          </Card>
        </div>
      )}
    </div>
  )
}
