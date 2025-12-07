import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useMarketStore, getConfig, useActiveProfile } from '@/store/marketStore'

export default function OrderPanel() {
  const [qty, setQty] = useState('5000')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [error, setError] = useState('')

  const { symbol, priceData, executeOrder } = useMarketStore()
  const profile = useActiveProfile()
    const positions = profile.positions
  const price = priceData[symbol]
  const currentPos = positions[symbol]

  const cfg = getConfig(symbol)

  useEffect(() => {
    setError('')
  }, [qty, sl, tp, symbol])

  const validate = () => {
    const q = Number(qty)
    const s = sl ? Number(sl) : null
    const t = tp ? Number(tp) : null

    if (!price || q <= 0) return 'Invalid price or size'
    if (q < cfg.minSize) return `Min size: ${cfg.minSize}`
    if (q > cfg.maxSize) return `Max size: ${cfg.maxSize}`
    if (currentPos && Math.abs(currentPos.size) + q > cfg.maxSize)
      return `Max position size exceeded`

    if (s !== null) {
      if (s <= 0) return 'SL must be > 0'
      if (currentPos?.size > 0 && s >= price) return 'Long SL must be below price'
      if (currentPos?.size < 0 && s <= price) return 'Short SL must be above price'
      if (!currentPos && s >= price && q > 0) return 'For Long, SL must be below entry'
      if (!currentPos && s <= price && q < 0) return 'For Short, SL must be above entry'
    }

    if (t !== null) {
      if (t <= 0) return 'TP must be > 0'
      if (currentPos?.size > 0 && t <= price) return 'Long TP must be above price'
      if (currentPos?.size < 0 && t >= price) return 'Short TP must be below price'
      if (!currentPos && t <= price && q > 0) return 'For Long, TP must be above entry'
      if (!currentPos && t >= price && q < 0) return 'For Short, TP must be below entry'
    }

    return ''
  }

  const handleOrder = (side: 'BUY' | 'SELL') => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    executeOrder(side, Number(qty), sl ? Number(sl) : undefined, tp ? Number(tp) : undefined)
    setSl('')
    setTp('')
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Order Execution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">SIZE</label>
          <Input
            value={qty}
            onChange={e => setQty(e.target.value.replace(/\D/g, '') || '1')}
            className="font-mono text-lg bg-background"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">STOP LOSS</label>
            <Input value={sl} onChange={e => setSl(e.target.value)} placeholder="Optional" className="font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">TAKE PROFIT</label>
            <Input value={tp} onChange={e => setTp(e.target.value)} placeholder="Optional" className="font-mono" />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => handleOrder('BUY')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12">
            BUY / LONG
          </Button>
          <Button onClick={() => handleOrder('SELL')} className="bg-red-600 hover:bg-red-700 text-white font-bold h-12">
            SELL / SHORT
          </Button>
        </div>

        <div className="pt-2 text-center border-t border-border mt-2">
          <span className="text-xs text-muted-foreground">MARK PRICE</span>
          <p className="text-2xl font-bold tracking-tight font-mono">
            ${price != null ? Number(price).toFixed(
              Math.max(2, (cfg.tickSize.toString().split('.')[1]?.length) || 2)
            ) : '—'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}