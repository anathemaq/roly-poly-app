"use client"

import type React from "react"
import { useState } from "react"

import { useDay } from "@/lib/day-context"
import { useCommunityTemplates } from "@/lib/use-community-templates"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CommunityTemplateCard } from "@/components/community-template-card"
import { Plus, Trash2, ChevronRight, Loader2, Users, FolderOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function TemplatesScreen() {
  const { templates, deleteTemplate, addTemplate } = useDay()
  const {
    templates: communityTemplates,
    userLikes,
    isLoading: isCommunityLoading,
    toggleLike,
    downloadTemplate,
  } = useCommunityTemplates()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"my" | "community">("my")
  const [likingTemplate, setLikingTemplate] = useState<string | null>(null)

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Вы уверены, что хотите удалить этот шаблон?")) {
      deleteTemplate(id)
    }
  }

  const handleCreateNew = () => {
    router.push("/templates/new")
  }

  const handleLike = async (templateId: string) => {
    setLikingTemplate(templateId)
    await toggleLike(templateId)
    setLikingTemplate(null)
  }

  const handleDownload = async (templateId: string) => {
    const template = await downloadTemplate(templateId)
    if (template) {
      // Add to local templates
      addTemplate({
        name: template.name,
        activities: template.activities,
      })
      toast({
        title: "Шаблон скачан",
        description: `"${template.name}" добавлен в ваши шаблоны`,
      })
    }
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

      {/* Tabs */}
      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "my" | "community")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="my" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Мои
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Сообщество
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "my" ? (
        <>
          <main className="flex-1 overflow-y-auto p-4 space-y-3">
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">У вас пока нет шаблонов</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Создайте свой первый шаблон или скачайте из сообщества
                </p>
              </div>
            ) : (
              templates.map((template) => {
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
              })
            )}
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
        </>
      ) : (
        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          {isCommunityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : communityTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Пока нет шаблонов от сообщества</p>
              <p className="text-sm text-muted-foreground mt-1">
                Будьте первым, кто поделится своим шаблоном!
              </p>
            </div>
          ) : (
            communityTemplates.map((template) => (
              <CommunityTemplateCard
                key={template.id}
                template={template}
                isLiked={userLikes.includes(template.id)}
                onLike={handleLike}
                onDownload={handleDownload}
                isLikeLoading={likingTemplate === template.id}
              />
            ))
          )}
        </main>
      )}
    </div>
  )
}
