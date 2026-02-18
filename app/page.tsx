"use client"

import { useState, useEffect } from "react"
import { useDay } from "@/lib/day-context"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { IOSPicker } from "@/components/ios-picker"
import { Play } from "lucide-react"
import { useRouter } from "next/navigation"

export default function StartScreen() {
  const { templates, startDay } = useDay()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id)
  const router = useRouter()
  

  // Отключаем скролл на главной странице
  useEffect(() => {
    // Отключаем скролл
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.height = '100vh'
    document.documentElement.style.height = '100vh'
    
    return () => {
      // Восстанавливаем при размонтировании
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
      document.body.style.height = 'auto'
      document.documentElement.style.height = 'auto'
    }
  }, [])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0]
  
  const handleStartDay = () => {
    startDay(selectedTemplate)
    router.push("/today")
  }

  const totalDuration = selectedTemplate.activities.reduce((sum, activity) => sum + activity.duration, 0)
  const hours = Math.floor(totalDuration / 60)
  const minutes = totalDuration % 60

  const now = new Date()
  const timeString = now.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })
  const dateString = now.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  const pickerOptions = templates.map((template) => ({
    id: template.id,
    label: template.name,
  }))

  return (
    <div
      className="fixed inset-0 bg-background flex flex-col overflow-hidden"
      style={{ overscrollBehavior: 'none', touchAction: 'none' }}
    >
      <header
        className="px-4 pb-2 flex justify-end items-center flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
      >
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col px-4 pb-[calc(56px+env(safe-area-inset-bottom)+8px)] overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-start space-y-3">
          {/* Time and date */}
          <div className="text-center space-y-0.5">
            <div className="text-5xl font-bold text-foreground tracking-tight">{timeString}</div>
            <div className="text-sm text-muted-foreground capitalize">{dateString}</div>
          </div>

          {/* Template picker */}
          <div className="w-full max-w-sm space-y-2">
            <div className="h-[250px]">
              <IOSPicker options={pickerOptions} value={selectedTemplateId} onChange={setSelectedTemplateId} />
            </div>

            {/* Template summary */}
            <div className="text-center">
              <span className="text-xs text-muted-foreground">
                {selectedTemplate.activities.length} активностей · {hours}ч {minutes}м
              </span>
            </div>

            {/* Activity preview */}
            <div className="space-y-1 px-2">
              <h3 className="text-[10px] font-medium text-muted-foreground text-center uppercase tracking-wider">
                Активности дня
              </h3>
              <div className="space-y-0.5">
                {selectedTemplate.activities.slice(0, 3).map((activity) => {
                  const activityHours = Math.floor(activity.duration / 60)
                  const activityMinutes = activity.duration % 60
                  const durationText = activityHours > 0 ? `${activityHours}ч ${activityMinutes}м` : `${activityMinutes}м`

                  return (
                    <div key={activity.id} className="flex items-center gap-2 text-[11px]">
                      <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-foreground flex-1 truncate">{activity.name}</span>
                      <span className="text-muted-foreground">{durationText}</span>
                    </div>
                  )
                })}
                {selectedTemplate.activities.length > 3 && (
                  <div className="text-[10px] text-muted-foreground text-center pt-0.5">
                    +{selectedTemplate.activities.length - 3} еще
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Start button */}
        <div
          className="fixed left-0 right-0 px-4 max-w-md mx-auto"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', zIndex: 50 }}
        >
          <button
            onClick={handleStartDay}
            className="w-full flex items-center justify-center gap-2 h-13 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl active:scale-[0.98] transition-transform"
          >
            <Play className="h-4 w-4" />
            Начать день
          </button>
        </div>
      </main>
    </div>
  )
}
