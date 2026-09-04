import { useState, useEffect } from 'react'
import { useAuthenticatedApi } from '@/hooks/useAuthenticatedApi'
import type { SearchResult, SearchResponse } from '@/types'

interface UseResourceSearchOptions {
  tenantId: string | undefined
  enabled?: boolean
  minQueryLength?: number
  debounceMs?: number
}

interface UseResourceSearchReturn {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: SearchResult[]
  isSearching: boolean
  hasMinQueryLength: boolean
  searchCount: number
}

export function useResourceSearch({
  tenantId,
  enabled = true,
  minQueryLength = 2,
  debounceMs = 300
}: UseResourceSearchOptions): UseResourceSearchReturn {
  const api = useAuthenticatedApi()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchCount, setSearchCount] = useState(0)

  const hasMinQueryLength = searchQuery.length >= minQueryLength

  useEffect(() => {
    if (!enabled || !searchQuery || searchQuery.length < minQueryLength) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    if (!tenantId) {
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const response = await api.get<SearchResponse>(
          `/search/tenant-resources?tenantId=${tenantId}&query=${encodeURIComponent(searchQuery)}`
        )
        setSearchCount((prev) => prev + 1)
        if (response.data?.success && response.data?.data?.results) {
          setSearchResults(response.data.data.results)
        }
      } catch (_error) {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchQuery, tenantId, api, enabled, minQueryLength, debounceMs])

  // Reset search count when disabled (e.g., command menu closes)
  useEffect(() => {
    if (!enabled) {
      setSearchCount(0)
    }
  }, [enabled])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    hasMinQueryLength,
    searchCount
  }
}
