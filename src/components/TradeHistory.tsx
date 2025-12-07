import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveProfile, useMarketStore } from '@/store/marketStore'

export default function TradeHistory() {
  const getHistory = useActiveProfile() 
  const history = getHistory.history;
  // const history = useMarketStore(s => s.history)

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b border-border">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Recent Trade History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[300px] overflow-y-auto">
            {history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No closed trades yet.
                </div>
            ) : (
                <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px]">Time</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Exit</TableHead>
                    <TableHead className="text-right">Commissions</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {history.map((trade) => (
                    <TableRow key={trade.id} className="border-border/50">
                        <TableCell className="font-mono text-xs text-muted-foreground">{trade.time.split(' ')[0]}</TableCell>
                        <TableCell className="font-medium">{trade.sym}</TableCell>
                        <TableCell>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                {trade.side}
                            </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{trade.entryPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{trade.exitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-red-500">-{trade.commission.toFixed(2)}</TableCell> 
                        <TableCell className={`text-right font-bold ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            )}
        </div>
      </CardContent>
    </Card>
  )
}