import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveProfile, useMarketStore } from '@/store/marketStore'
import { useMemo } from 'react'

export default function DOMLadder() {
  const profile = useActiveProfile()
  const { symbol, priceData, domLevels } = useMarketStore()

  const price = priceData[symbol] ?? 350
  const position = profile.positions[symbol]

  const levels = useMemo(() => {
    return (domLevels[symbol] || []).filter(l => l.bidSize > 0 || l.askSize > 0)
  }, [domLevels, symbol])

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Depth of Market
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden bg-background">
        <div className="grid grid-cols-3 text-[10px] font-mono font-bold text-muted-foreground bg-muted/30 border-b border-border">
          <div className="p-1.5 text-right">BID VOL</div>
          <div className="p-1.5 text-center">PRICE</div>
          <div className="p-1.5 text-left">ASK VOL</div>
        </div>

        <div className="overflow-y-auto h-full">
          {levels.map((level, i) => {
            const priceNum = level.price
            const isCenter = Math.abs(priceNum - price) < 0.025
            const isEntry = position && Math.abs(priceNum - position.avgPrice) < 0.025

            return (
              <div
                key={i}
                className={`grid grid-cols-3 text-xs font-mono border-b border-border/30 transition-colors ${
                  isEntry ? 'bg-blue-500/10' : 'hover:bg-muted/50'
                }`}
              >
                <div className="p-1.5 text-right relative">
                  {level.bidSize > 0 && (
                    <>
                      <div
                        className="absolute inset-y-0 right-0 bg-emerald-500/10"
                        style={{ width: `${Math.min((level.bidSize / 15000) * 100, 100)}%` }}
                      />
                      <span className="text-emerald-600 dark:text-emerald-400 relative z-10">
                        {level.bidSize.toLocaleString()}
                      </span>
                    </>
                  )}
                  {isEntry && position.size > 0 && (
                    <span className="absolute left-1 top-1.5 bg-emerald-500 text-white text-[9px] px-1 rounded">MY BID</span>
                  )}
                </div>

                <div className={`p-1.5 text-center font-bold ${isCenter ? 'bg-primary/5 text-primary' : ''} ${isEntry ? 'text-blue-500' : ''}`}>
                  {priceNum.toFixed(3)}
                </div>

                <div className="p-1.5 text-left relative">
                  {level.askSize > 0 && (
                    <>
                      <div
                        className="absolute inset-y-0 left-0 bg-red-500/10"
                        style={{ width: `${Math.min((level.askSize / 15000) * 100, 100)}%` }}
                      />
                      <span className="text-red-600 dark:text-red-400 relative z-10">
                        {level.askSize.toLocaleString()}
                      </span>
                    </>
                  )}
                  {isEntry && position.size < 0 && (
                    <span className="absolute right-1 top-1.5 bg-red-500 text-white text-[9px] px-1 rounded">MY ASK</span>
                  )}
                </div>
              </div>
            )
          })}
          {levels.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading DOM...</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}