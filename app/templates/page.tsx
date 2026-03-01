"use client"

import type React from "react"
import { useState } from "react"

import { useDay } from "@/lib/day-context"
import { useCommunityTemplates, TEMPLATE_CATEGORIES, SORT_OPTIONS } from "@/lib/use-community-templates"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"


import { AppMenu } from "@/components/app-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TemplateKataCard } from "@/components/template-kata-card"
import { Plus, Trash2, ChevronRight, Loader2, Users, FolderOpen, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function TemplatesScreen() {
  const { templates, deleteTemplate, addTemplate } = useDay()
  const {
    templates: communityTemplates,
    userLikes,
    userFavorites,
    isLoading: isCommunityLoading,
    toggleLike,
    toggleFavorite,
    downloadTemplate,
    search,
    setSearch,
    category,
    setCategory,
    sortBy,
    setSortBy,
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

  const handleFavorite = async (templateId: string) => {
    await toggleFavorite(templateId)
  }

  const handleDownload = async (templateId: string) => {
    // Check for duplicate by name
    const communityTemplate = communityTemplates.find(t => t.id === templateId)
    if (communityTemplate) {
      const isDuplicate = templates.some(t => 
        t.name.toLowerCase() === communityTemplate.name.toLowerCase()
      )
      
      if (isDuplicate) {
        const confirmed = confirm(
          `У вас уже есть шаблон "${communityTemplate.name}". Скачать ещё раз?`
        )
        if (!confirmed) return
      }
    }

    const template = await downloadTemplate(templateId)
    if (template) {
      addTemplate({
        name: template.name,
        activities: template.activities,
      })
      toast({
        title: "Шаблон скачан",
        description: `"${template.name}" добавлен в ваши шаблоны`,
      })
    } else {
      toast({
        title: "Ошибка",
        description: "Не удалось скачать шаблон",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col">
      <header
        className="px-3 pb-3 flex justify-between items-center border-b border-border"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-2">
          <AppMenu />
          <h1 className="text-base font-semibold text-foreground">Шаблоны</h1>
        </div>
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

      {/* Sticky Create Button */}
      <div
        className="fixed left-0 right-0 p-4 z-10 bg-gradient-to-t from-background via-background to-transparent"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}
      >
        <div className="max-w-md mx-auto">
          <Button onClick={handleCreateNew} className="w-full flex items-center gap-2 shadow-lg">
            <Plus className="h-5 w-5" />
            Создать шаблон
          </Button>
        </div>
      </div>

      {activeTab === "my" ? (
        <>
          <main className="p-4 pb-28 space-y-3">
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
                  <div
                    key={template.id}
                    className="group relative flex cursor-pointer overflow-hidden rounded-lg bg-card hover:bg-card/80 transition-all duration-200 border border-border/50"
                    onClick={() => router.push(`/templates/${template.id}`)}
                  >
                    {/* Color indicator based on first activity */}
                    <div 
                      className="w-1.5 shrink-0" 
                      style={{ backgroundColor: template.activities[0]?.color || "#6b7280" }}
                    />

                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground leading-tight line-clamp-1">
                            {template.name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {template.activities.length} активностей
                            </span>
                            <span className="flex items-center gap-1">
                              {hours > 0 ? `${hours}ч ${minutes}м` : `${minutes}м`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(template.id, e)}
                            className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </main>
        </>
      ) : (
        <>
          {/* Search and Filters - Codewars style */}
          <div className="px-4 pt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            
            {/* Sort chips */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    sortBy === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                    category === cat.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <main className="p-4 pb-28 space-y-3">
          {isCommunityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : communityTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {search || category !== 'all' 
                  ? "Ничего не найдено" 
                  : "Пока нет шаблонов от сообщества"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || category !== 'all'
                  ? "Попробуйте изменить фильтры"
                  : "Будьте первым, кто поделится своим шаблоном!"}
              </p>
            </div>
          ) : (
            communityTemplates.map((template) => (
              <TemplateKataCard
                key={template.id}
                template={template}
                isLiked={userLikes.includes(template.id)}
                isFavorited={userFavorites.includes(template.id)}
                onLike={handleLike}
                onFavorite={handleFavorite}
                onDownload={handleDownload}
                isLikeLoading={likingTemplate === template.id}
              />
            ))
          )}
          </main>
        </>
      )}
    </div>
  )
}
