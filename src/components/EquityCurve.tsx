import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveProfile, useMarketStore } from '@/store/marketStore'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function EquityCurve() {
  const profile = useActiveProfile()
  const { priceData } = useMarketStore()
  const [data, setData] = useState<Array<{ time: string; equity: number }>>([])

  useEffect(() => {
    const updateEquity = () => {
      const currentEquity = profile.cash + Object.entries(profile.positions).reduce((sum, [sym, pos]) => {
        const price = priceData[sym] ?? pos.avgPrice
        return sum + (price - pos.avgPrice) * pos.size
      }, 0)

      let balance = 100000
      const points = profile.history
        .slice()
        .reverse()
        .map(trade => {
          balance += trade.netPnL
          return {
            time: new Date(trade.exitTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            equity: balance,
          }
        })

      const fullData = points.length > 0
        ? [...points, { time: 'Now', equity: currentEquity }]
        : [{ time: 'Start', equity: 100000 }, { time: 'Now', equity: currentEquity }]

      setData(fullData)
    }

    updateEquity()
    const interval = setInterval(updateEquity, 5000)

    return () => clearInterval(interval)
  }, [profile.cash, profile.positions, profile.history, priceData])

  const currentEquity = data[data.length - 1]?.equity || 100000
  const change = currentEquity - 100000
  const isPositive = change >= 0

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Equity Curve
          </CardTitle>
          <div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              ${Math.abs(change).toFixed(2)}
            </span>
            <span className={`text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              ({isPositive ? '+' : ''}{((change / 100000) * 100).toFixed(2)}%)
            </span>
            {isPositive ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
          </div>
        </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {data.length <= 1 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Waiting for first trade...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                domain={['dataMin - 1000', 'dataMax + 1000']}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(v: number) => `$${v.toFixed(2)}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  border: '1px solid hsl(var(--border))', 
                }}
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={3}
                dot={false}
                animationDuration={800}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}