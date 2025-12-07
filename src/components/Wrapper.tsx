import { useEffect, useState } from 'react'
import { useMarketStore } from '@/store/marketStore'
import { Loader2, AlertCircle } from 'lucide-react'

export default function TradingAppWrapper({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const unsubscribe = useMarketStore.persist.onFinishHydration(() => {
        setIsLoading(false)
      })
      const timeout = setTimeout(() => setIsLoading(false), 1000)
      return () => {
        unsubscribe()
        clearTimeout(timeout)
      }
    } catch {
      setError('Failed to load')
      setIsLoading(false)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-8 animate-fadeIn">
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-emerald-500/40 to-cyan-500/40 rounded-full w-64 h-64 animate-pulse" />
            <Loader2 className="relative z-10 w-20 h-20 animate-spin text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-light tracking-wider text-gray-300">
              Loading your session
            </h2>
            <p className="mt-2 text-sm text-gray-500">Please wait a moment...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-8">
        <div className="flex flex-col items-center space-y-6 max-w-md w-full bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-2xl p-10 text-center animate-fadeIn">
          <AlertCircle className="w-20 h-20 text-red-400" />
          <h2 className="text-3xl font-bold text-white">Connection Lost</h2>
          <p className="text-gray-400">We couldn't restore your trading session.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition transform hover:scale-105"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return <div className="animate-fadeIn">{children}</div>
}