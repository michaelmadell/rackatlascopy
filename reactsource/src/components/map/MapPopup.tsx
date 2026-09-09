import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import * as maplibregl from 'maplibre-gl'

interface MapPopupProps {
  map: maplibregl.Map
  activeLocation: {
    _id: string
    reference: string
    name?: string
    longitude: number
    latitude: number
  } | null
  onClose?: () => void
  children: React.ReactNode
}

function MapPopup({ map, activeLocation, onClose, children }: MapPopupProps) {
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const contentRef = useRef(document.createElement('div'))

  // Update popup when activeLocation changes
  useEffect(() => {
    if (!activeLocation) {
      // Remove popup when no active location
      popupRef.current?.remove()
      return
    }

    // Create a new popup for each active location
    popupRef.current = new maplibregl.Popup({
      closeOnClick: false,
      offset: 25
    })

    // Listen for close event
    if (onClose) {
      popupRef.current.on('close', onClose)
    }

    popupRef.current
      .setLngLat([activeLocation.longitude, activeLocation.latitude])
      .setDOMContent(contentRef.current)
      .addTo(map)

    return () => {
      popupRef.current?.remove()
    }
  }, [activeLocation, map, onClose])

  if (!activeLocation) return null

  return <>{createPortal(<div>{children}</div>, contentRef.current)}</>
}

export default MapPopup
