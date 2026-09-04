import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import mapboxgl from 'mapbox-gl'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { Location } from '@/types'

interface MapMarkerProps {
  map: mapboxgl.Map
  location: Location
  isActive?: boolean
  onClick: (location: Location) => void
  draggable?: boolean
  onDragEnd?: (location: Location, newCoords: { lat: number; lng: number }) => void
}

function MapMarker({ map, location, isActive, onClick, draggable = false, onDragEnd }: MapMarkerProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [markerContainer, setMarkerContainer] = useState<HTMLDivElement | null>(null)

  // Create marker only once when component mounts
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only depend on map, not location
  useEffect(() => {
    if (!map) return
    const el = document.createElement('div')

    const marker = new mapboxgl.Marker({
      element: el,
      draggable: draggable
    })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)

    markerRef.current = marker
    setMarkerContainer(el)

    return () => {
      marker.remove()
      markerRef.current = null
      setMarkerContainer(null)
    }
  }, [map])

  // Update marker position when location changes
  useEffect(() => {
    if (markerRef.current && location.longitude && location.latitude) {
      markerRef.current.setLngLat([location.longitude, location.latitude])
    }
  }, [location.longitude, location.latitude])

  // Update draggable state
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setDraggable(draggable)
    }
  }, [draggable])

  // Handle drag end events
  useEffect(() => {
    if (!markerRef.current || !draggable || !onDragEnd) return

    const handleDragEnd = () => {
      if (!markerRef.current) return
      const lngLat = markerRef.current.getLngLat()
      onDragEnd(location, {
        lat: Number.parseFloat(lngLat.lat.toFixed(4)),
        lng: Number.parseFloat(lngLat.lng.toFixed(4))
      })
    }

    markerRef.current.on('dragend', handleDragEnd)

    return () => {
      markerRef.current?.off('dragend', handleDragEnd)
    }
  }, [draggable, onDragEnd, location])

  return markerContainer
    ? createPortal(
        <button
          type="button"
          onClick={() => onClick(location)}
          style={{
            cursor: draggable ? 'move' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? '34px' : '40px',
            height: isMobile ? '34px' : '40px',
            border: 'none',
            background: 'transparent',
            padding: 0
          }}
          title={location.name}>
          <svg xmlns="http://www.w3.org/2000/svg" width="41" height="46" fill="none" viewBox="0 0 41 46">
            <title className="sr-only">Map pin</title>
            <path
              className={isActive ? 'fill-brand-blue' : 'fill-foreground'}
              d="M41 20c0 11.046-17.5 26-20 26S1 31.046 1 20 9.954 0 21 0s20 8.954 20 20"
            />
            <path
              className={isActive ? 'stroke-background dark:stroke-foreground' : 'stroke-background'}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M13 27h16M18.333 15.444h.89M18.332 19h.89m-.89 3.556h.89m3.555-7.112h.889M22.777 19h.89m-.89 3.556h.89M14.777 27V12.778A1.78 1.78 0 0 1 16.557 11h8.888a1.78 1.78 0 0 1 1.778 1.778V27"
            />
          </svg>
        </button>,
        markerContainer
      )
    : null
}

export default MapMarker
