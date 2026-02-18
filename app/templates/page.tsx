"use client"

import type React from "react"

import { useDay } from "@/lib/day-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Plus, Trash2, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function TemplatesScreen() {
  const { templates, deleteTemplate } = useDay()
  const router = useRouter()

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Вы уверены, что хотите удалить этот шаблон?")) {
      deleteTemplate(id)
    }
  }

  const handleCreateNew = () => {
    router.push("/templates/new")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header
        className="px-3 pb-3 flex justify-between items-center border-b border-border"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <h1 className="text-base font-semibold text-foreground">Шаблоны</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {templates.map((template) => {
          const totalDuration = template.activities.reduce((sum, a) => sum + a.duration, 0)
          const hours = Math.floor(totalDuration / 60)
          const minutes = totalDuration % 60

          return (
            <Card
              key={template.id}
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => router.push(`/templates/${template.id}`)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-lg">{template.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{template.activities.length} активностей</span>
                    <span>•</span>
                    <span>
                      {hours > 0 && `${hours}ч `}
                      {minutes}м
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(template.id, e)}
                    className="h-9 w-9 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </Card>
          )
        })}
      </main>

      <div
        className="fixed left-0 right-0 p-4"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
      >
        <div className="max-w-md mx-auto">
          <Button onClick={handleCreateNew} className="w-full flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Создать шаблон
          </Button>
        </div>
      </div>
    </div>
  )
}
