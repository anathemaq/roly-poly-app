"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDay, POMODORO_PRESETS } from "@/lib/day-context"

export default function FocusScreen() {
  const {
    pomodoroPreset,
    pomodoroPhase,
    pomodoroTimeRemaining,
    pomodoroIsRunning,
    pomodoroCompletedSessions,
    setPomodoroPreset,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    skipPomodoroPhase,
  } = useDay()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getProgress = () => {
    const total = pomodoroPhase === "work" ? pomodoroPreset.work * 60 : pomodoroPreset.break * 60
    return ((total - pomodoroTimeRemaining) / total) * 100
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden" style={{ overscrollBehavior: 'none', touchAction: 'none' }}>
      {/* Theme toggle only, lowered by ~24px */}
      <div className="absolute right-3 top-2 z-10">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 space-y-6 overflow-hidden">
        <div className="w-full space-y-6">
          {/* Phase Indicator */}
          <div className="text-center">
            <div
              className={cn(
                "inline-block px-3 py-1.5 rounded-full text-xs font-medium",
                pomodoroPhase === "work"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {pomodoroPhase === "work" ? "Рабочая сессия" : "Перерыв"}
            </div>
          </div>

          {/* Timer Display */}
          <div className="flex justify-center">
            <div className="relative w-56 h-56">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-border"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgress() / 100)}`}
                  strokeLinecap="round"
                  className={cn(
                    "transition-all duration-1000",
                    pomodoroPhase === "work" ? "text-primary" : "text-secondary",
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-foreground">{formatTime(pomodoroTimeRemaining)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={resetPomodoro}
              className="rounded-full h-11 w-11 bg-transparent"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={pomodoroIsRunning ? pausePomodoro : startPomodoro}
              className="rounded-full h-14 w-14"
            >
              {pomodoroIsRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={skipPomodoroPhase}
              className="rounded-full h-11 w-11 bg-transparent"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Presets */}
          <Card className="p-3">
            <h3 className="text-xs font-medium text-muted-foreground text-center mb-2">Предустановки</h3>
            <div className="flex gap-1.5 justify-center">
              {POMODORO_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant={pomodoroPreset.label === preset.label ? "default" : "outline"}
                  onClick={() => setPomodoroPreset(preset)}
                  className="flex-1 text-xs h-8"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </Card>

          {/* Session Counter */}
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{pomodoroCompletedSessions}</div>
            <div className="text-xs text-muted-foreground mt-0.5">завершенных сессий сегодня</div>
          </div>
        </div>
      </main>
    </div>
  )
}
