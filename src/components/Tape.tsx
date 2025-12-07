import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMarketStore } from '@/store/marketStore'

export default function Tape() {
  const tape = useMarketStore(s => s.tape)

  return (
    <Card className="shadow-sm flex flex-col h-full overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Market Tape</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto">
          {tape.slice(0, 50).map((t, i) => (
            <div
              key={i}
              className={`flex justify-between px-4 py-1 border-b border-border/40 text-xs font-mono ${
                t.isUser ? 'bg-primary/5' : ''
              }`}
            >
              <span className="text-muted-foreground w-20">{t.time.split(' ')[0]}</span>
              <span className={`w-10 font-bold ${t.side === 'BUY' ? 'text-emerald-500' : t.side === 'SELL' ? 'text-red-500' : 'text-primary'}`}>
                {t.side.substring(0,1)}
              </span>
              <span className="flex-1 text-right text-foreground">{t.size.toLocaleString()}</span>
              <span className="w-20 text-right text-muted-foreground">@{t.price}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}