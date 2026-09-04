import { useState, useEffect, useCallback } from 'react'
import * as Sentry from '@sentry/react'
import {
  SearchBoxCore,
  SessionToken,
  type SearchBoxSuggestion,
  type SearchBoxFeatureSuggestion
} from '@mapbox/search-js-core'
import { AddressMinimap } from '@mapbox/search-js-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@patchdocs/ui'
import { useDebounce } from '@/hooks/useDebounce'
import * as m from '@/paraglide/messages'

interface AddressSearchProps {
  onSelect: (feature: SearchBoxFeatureSuggestion) => void
  onClear?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
  mapboxAccessToken: string
}

interface Suggestion {
  mapbox_id: string
  name: string
  full_address?: string
  place_formatted?: string
}

const AddressSearch = ({
  onSelect,
  onClear,
  placeholder = m.address_search_searching(),
  className = '',
  disabled = false,
  mapboxAccessToken
}: AddressSearchProps) => {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSelected, setHasSelected] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<SearchBoxFeatureSuggestion | null>(null)
  const [sessionToken] = useState(() => new SessionToken())
  const [searchBox] = useState(() => new SearchBoxCore({ accessToken: mapboxAccessToken }))

  const debouncedQuery = useDebounce(query, 300)

  // Clear hasSelected flag when user manually changes the query
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)

      // If we had a selection and the user is changing/clearing the text
      if (hasSelected) {
        // Check if the value is being cleared or significantly changed
        const isClearing = value.length === 0 || value.length < query.length
        const isDifferent = value !== query

        if (isClearing || isDifferent) {
          setHasSelected(false)
          setSelectedFeature(null)
          // Notify parent that selection was cleared
          if (onClear) {
            onClear()
          }
        }
      }
    },
    [hasSelected, query, onClear]
  )

  // Fetch suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Don't fetch if we just selected an address
      if (hasSelected) {
        return
      }

      if (!debouncedQuery || debouncedQuery.length < 3) {
        setSuggestions([])
        return
      }

      setIsLoading(true)
      try {
        const result = await searchBox.suggest(debouncedQuery, {
          sessionToken,
          limit: 10
        })

        if (result.suggestions) {
          setSuggestions(
            result.suggestions.map((s) => ({
              mapbox_id: s.mapbox_id,
              name: s.name,
              full_address: s.full_address,
              place_formatted: s.place_formatted
            }))
          )
        } else {
          setSuggestions([])
        }
      } catch (error) {
        Sentry.withScope((scope) => {
          scope.setContext('data', { query: debouncedQuery })
          scope.setTag('action', 'address_search_get_suggestions')
          Sentry.captureException(error)
        })
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSuggestions()
  }, [debouncedQuery, searchBox, sessionToken, hasSelected])

  // Handle selection
  const handleSelect = useCallback(
    async (mapboxId: string) => {
      const suggestion = suggestions.find((s) => s.mapbox_id === mapboxId) as SearchBoxSuggestion
      if (!suggestion) return

      setIsLoading(true)
      try {
        // Retrieve full feature details including coordinates
        const { features } = await searchBox.retrieve(suggestion, { sessionToken })

        if (features && features.length > 0) {
          const feature = features[0] as SearchBoxFeatureSuggestion
          const displayText = suggestion.full_address || suggestion.place_formatted || suggestion.name
          setQuery(displayText)
          setHasSelected(true) // Mark that we've selected an address
          setSelectedFeature(feature) // Store the selected feature for the minimap
          setSuggestions([]) // Clear suggestions immediately
          onSelect(feature)
        }
      } catch (error) {
        Sentry.withScope((scope) => {
          scope.setContext('data', { suggestion: JSON.stringify(suggestion) })
          scope.setTag('action', 'address_search_retrieve_suggestion')
          Sentry.captureException(error)
        })
      } finally {
        setIsLoading(false)
      }
    },
    [suggestions, searchBox, sessionToken, onSelect]
  )

  return (
    <Command className={`border border-border h-[unset] ${className}`} shouldFilter={false}>
      <CommandInput placeholder={placeholder} value={query} onValueChange={handleQueryChange} disabled={disabled} />
      {!hasSelected ? (
        <CommandList className="h-50 max-h-50">
          {query.length > 0 && query.length < 3 && <CommandEmpty>{m.address_search_empty_placeholder()}</CommandEmpty>}
          {query.length >= 3 && suggestions.length === 0 && !isLoading && (
            <CommandEmpty>{m.address_search_no_results()}</CommandEmpty>
          )}
          {isLoading && <CommandEmpty>{m.address_search_searching()}</CommandEmpty>}
          {suggestions.length > 0 && (
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.mapbox_id}
                  value={suggestion.mapbox_id}
                  onSelect={() => handleSelect(suggestion.mapbox_id)}>
                  <div className="flex flex-col">
                    <span className="font-medium">{suggestion.name}</span>
                    {suggestion.full_address && suggestion.full_address !== suggestion.name && (
                      <span className="text-sm text-muted-foreground">{suggestion.full_address}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      ) : (
        <div className="h-50 max-h-50 overflow-hidden">
          {selectedFeature && (
            <AddressMinimap
              feature={selectedFeature}
              accessToken={mapboxAccessToken}
              show={true}
              satelliteToggle={true}
              canAdjustMarker={false}
              theme={{ variables: { borderRadius: '0' } }}
            />
          )}
        </div>
      )}
    </Command>
  )
}

export default AddressSearch
