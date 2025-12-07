import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveProfile, useMarketStore } from '@/store/marketStore'

export default function PositionsTable() {
  const { priceData, closePosition } = useMarketStore()
  const profile = useActiveProfile()
  const positions = profile.positions

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Open Positions</CardTitle>
      </CardHeader>

      <div className="flex-1 overflow-auto">
        {Object.keys(positions).length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground min-h-[100px]">
                No active positions
            </div>
        ) : (
            <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow className="hover:bg-transparent">
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Avg Price</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(positions).map(([sym, pos]) => {
                const pnl = (priceData[sym] - pos.avgPrice) * pos.size
                return (
                    <TableRow key={sym} className="border-border/50">
                    <TableCell className="font-bold">{sym}</TableCell>
                    <TableCell className="text-right font-mono">{pos.size.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{pos.avgPrice.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-bold font-mono ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(pnl >= 0 ? '+' : '') + pnl.toFixed(2)}
                    </TableCell>
                    <TableCell>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => closePosition(sym)}>
                        ✕
                        </Button>
                    </TableCell>
                    </TableRow>
                )
                })}
            </TableBody>
            </Table>
        )}
      </div>
    </div>
  )
}