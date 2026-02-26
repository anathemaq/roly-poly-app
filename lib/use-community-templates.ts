"use client"

import useSWR from "swr"
import { useCallback, useState, useMemo } from "react"

interface Activity {
  name: string
  duration: number
  color: string
}

interface CommunityTemplate {
  id: string
  name: string
  description: string | null
  activities: Activity[]
  likes_count: number
  downloads_count: number
  user_id: string
  created_at: string
  category: string
  author: {
    nickname: string
  }
}

export type SortOption = 'likes' | 'newest' | 'downloads'
export type CategoryOption = 'all' | 'productivity' | 'sport' | 'study' | 'health' | 'work' | 'other'

export const TEMPLATE_CATEGORIES = [
  { value: 'all' as const, label: 'Все' },
  { value: 'productivity' as const, label: 'Продуктивность' },
  { value: 'sport' as const, label: 'Спорт' },
  { value: 'study' as const, label: 'Учёба' },
  { value: 'health' as const, label: 'Здоровье' },
  { value: 'work' as const, label: 'Работа' },
  { value: 'other' as const, label: 'Другое' },
]

export const SORT_OPTIONS = [
  { value: 'likes' as const, label: 'По лайкам' },
  { value: 'downloads' as const, label: 'По скачиваниям' },
  { value: 'newest' as const, label: 'По дате' },
]

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("Failed to fetch")
  }
  return res.json()
}

export function useCommunityTemplates() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryOption>('all')
  const [sortBy, setSortBy] = useState<SortOption>('likes')

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category !== 'all') params.set('category', category)
    params.set('sort', sortBy)
    return params.toString()
  }, [search, category, sortBy])

  const { data: templates, error, isLoading, mutate } = useSWR<CommunityTemplate[]>(
    `/api/community/templates?${queryParams}`,
    fetcher
  )

  const { data: userLikes, mutate: mutateLikes } = useSWR<string[]>(
    "/api/community/user-likes",
    fetcher
  )

  const toggleLike = useCallback(async (templateId: string) => {
    const isLiked = userLikes?.includes(templateId)
    
    // Optimistic update
    mutateLikes(
      isLiked
        ? userLikes?.filter((id) => id !== templateId)
        : [...(userLikes || []), templateId],
      false
    )
    
    mutate(
      templates?.map((t) =>
        t.id === templateId
          ? { ...t, likes_count: t.likes_count + (isLiked ? -1 : 1) }
          : t
      ),
      false
    )

    try {
      const res = await fetch(`/api/community/templates/${templateId}/like`, {
        method: isLiked ? "DELETE" : "POST",
      })
      
      if (!res.ok) {
        throw new Error("Failed to toggle like")
      }

      // Revalidate
      mutate()
      mutateLikes()
    } catch (error) {
      // Revert on error
      mutate()
      mutateLikes()
    }
  }, [userLikes, templates, mutate, mutateLikes])

  const downloadTemplate = useCallback(async (templateId: string) => {
    try {
      const res = await fetch(`/api/community/templates/${templateId}/download`, {
        method: "POST",
      })
      
      if (!res.ok) {
        throw new Error("Failed to download template")
      }

      const data = await res.json()
      
      // Revalidate to update download count
      mutate()
      
      return data.template
    } catch (error) {
      console.error("Failed to download template:", error)
      return null
    }
  }, [mutate])

  const publishTemplate = useCallback(async (
    name: string,
    description: string,
    activities: Activity[],
    category: string = 'other'
  ) => {
    try {
      const res = await fetch("/api/community/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, activities, category }),
      })
      
      if (!res.ok) {
        throw new Error("Failed to publish template")
      }

      const data = await res.json()
      mutate()
      return data
    } catch (error) {
      console.error("Failed to publish template:", error)
      return null
    }
  }, [mutate])

  return {
    templates: templates || [],
    userLikes: userLikes || [],
    isLoading,
    error,
    toggleLike,
    downloadTemplate,
    publishTemplate,
    refresh: mutate,
    // Filters
    search,
    setSearch,
    category,
    setCategory,
    sortBy,
    setSortBy,
  }
}
