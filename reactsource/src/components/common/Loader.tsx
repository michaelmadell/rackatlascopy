import { useState, useEffect } from 'react'
import LoadingIcon from '@/components/common/LoadingIcon'

export default function Loader() {
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingIndicator(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (!showLoadingIndicator) return null

  return (
    <div className="flex justify-center items-center h-full">
      <LoadingIcon />
    </div>
  )
}
