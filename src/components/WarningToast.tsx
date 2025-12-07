import React, { useEffect, useState } from 'react'
import { useMarketStore } from '@/store/marketStore'
import { X, AlertTriangle, Info } from 'lucide-react'

const baseStyle = "fixed bottom-4 right-4 z-[100] max-w-sm w-full p-4 rounded-xl shadow-2xl transition-all duration-300 ease-in-out"
const errorStyle = "bg-red-600 text-white border border-red-700"
const infoStyle = "bg-blue-600 text-white"
const hiddenStyle = "opacity-0 translate-x-full pointer-events-none"

export default function WarningToast() {
  const errorQueue = useMarketStore(s => s.errorQueue || [])
  const dismissWarning = useMarketStore(s => s.dismissWarning)

  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  const currentToast = errorQueue[0] ?? null

  useEffect(() => {
    if (!currentToast) return

    const autoHide = setTimeout(() => {
      setIsAnimatingOut(true)
    }, 4500)

    const remove = setTimeout(() => {
      dismissWarning()
      setIsAnimatingOut(false)
    }, 5000)

    return () => {
      clearTimeout(autoHide)
      clearTimeout(remove)
    }
  }, [currentToast, dismissWarning])

  const handleDismiss = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      dismissWarning()
      setIsAnimatingOut(false)
    }, 300)
  }

  if (!currentToast) return null

  const isError = currentToast.type === 'error'

  return (
    <div
      className={`${baseStyle} ${isError ? errorStyle : infoStyle} ${
        isAnimatingOut ? hiddenStyle : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex items-center gap-3">
        {isError ? (
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        ) : (
          <Info className="w-5 h-5 flex-shrink-0" />
        )}
        <p className="text-sm font-medium flex-1">{currentToast.message}</p>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {errorQueue.length > 1 && (
        <div className="absolute -top-2 -left-2 px-2 py-1 text-xs font-bold bg-white/20 rounded-full">
          +{errorQueue.length - 1}
        </div>
      )}
    </div>
  )
}