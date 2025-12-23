import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useActiveNews, useMarketStore } from '@/store/marketStore'
import { cn } from '@/lib/utils'
import { Clock, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

const getDriftIcon = (drift: number) => {
    if (drift > 0.01) return <TrendingUp className="w-3 h-3 text-emerald-400" />
    if (drift < -0.01) return <TrendingDown className="w-3 h-3 text-red-400" />
    return <Zap className="w-3 h-3 text-yellow-400" />
}

export default function MarketNewsFeed() {
    const activeNews = useActiveNews()
    const errorQueue = useMarketStore(s => s.errorQueue)

    const [currentTime, setCurrentTime] = useState(Date.now())

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now())
        }, 1000)

        return () => clearInterval(timer)
    }, [])
    
    const newsHistory = errorQueue
        .filter(item => item.type === 'info')
        .slice(0, 5)

    return (
        <Card className="min-h-[300px]">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    ⚡️ Live Market News Feed
                </CardTitle>
                <Badge variant="secondary" className="bg-yellow-600/10 text-yellow-400 text-[10px] font-semibold py-0.5">
                    {activeNews.length} Active Events
                </Badge>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-primary/80 uppercase">Active Impacts</h4>
                    {activeNews.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No major news currently affecting the market.</p>
                    ) : (
                        <div className="space-y-2">
                            {activeNews.map(news => {
                                const endTime = news.time + news.duration * 1000
                                const remainingSeconds = Math.max(0, Math.floor((endTime - currentTime) / 1000))
                                
                                const isBullish = news.priceDrift > 0.01
                                const isBearish = news.priceDrift < -0.01
                                const isVolatile = news.volatilityMultiplier > 1.2 || news.volatilityMultiplier < 0.8
                                
                                return (
                                    <div 
                                        key={news.id} 
                                        className={cn(
                                            "p-2 rounded-lg border flex items-start space-x-2 transition-all duration-300",
                                            isBullish && 'bg-emerald-500/10 border-emerald-500/30',
                                            isBearish && 'bg-red-500/10 border-red-500/30',
                                            !isBullish && !isBearish && 'bg-blue-500/10 border-blue-500/30'
                                        )}
                                    >
                                        <div className="pt-1">{getDriftIcon(news.priceDrift)}</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium leading-snug">{news.headline}</p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                                                    {news.targets.join(', ')}
                                                </Badge>
                                                {isVolatile && (
                                                    <Badge className="h-4 px-1.5 text-[10px]" variant="outline">
                                                        Vol: x{news.volatilityMultiplier.toFixed(1)}
                                                    </Badge>
                                                )}
                                                <div className="flex items-center text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    <span className="font-mono">{remainingSeconds}s left</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="space-y-2 pt-2 border-t border-dashed border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Recent Announcements</h4>
                    <ul className="space-y-1">
                        {newsHistory.map((item, index) => (
                            <li key={item.id} className="text-xs text-muted-foreground/80 flex items-start">
                                <span className="text-xs font-mono w-14 flex-shrink-0">
                                    {new Date(item.id).toLocaleTimeString()}
                                </span>
                                <span className="flex-1">{item.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    )
}