import { useEffect } from 'react'
import Chart from './components/Chart'
import OrderPanel from './components/OrderPanel'
import PositionsTable from './components/PositionsTable'
import DOMLadder from './components/DOMLadder'
import Tape from './components/Tape'
import Header from './components/Header'
import TradeHistory from './components/TradeHistory'
import { useMarketStore } from './store/marketStore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { ACTIVE_SYMBOLS } from "@/store/marketStore"
import WarningToast from './components/WarningToast'
import TradingAppWrapper from './components/Wrapper'
import EquityCurve from './components/EquityCurve'
import VersionBadge from './components/VersionBadge'

export default function App() {
  useEffect(() => { useMarketStore.getState().startSimulation() }, [])

  const symbol = useMarketStore(s => s.symbol)
  const setSymbol = useMarketStore(s => s.setSymbol)
  const timeframe = useMarketStore(s => s.timeframe)
  const setTimeframe = useMarketStore(s => s.setTimeframe)

  return (
    <TradingAppWrapper>
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <Header />
      
      <WarningToast />
      <main className="mx-auto max-w-[1800px] p-6 space-y-6 my-4">
        <div className="flex items-center justify-between">
            <div className="flex gap-3">
                 <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger className="w-[180px] bg-card border-border shadow-sm h-10">
                      <span className="text-muted-foreground mr-2 text-xs uppercase">Asset</span>
                      <SelectValue placeholder="Symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVE_SYMBOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-[140px] bg-card border-border shadow-sm h-10">
                      <span className="text-muted-foreground mr-2 text-xs uppercase">Time</span>
                      <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    {["5s","15s","30s","1m","5m"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
            </div>
            <div className="text-xs text-muted-foreground font-mono">
                CONNECTED: <span className="text-emerald-500">STABLE</span>
            </div>
        </div>
        <div className="grid grid-cols-12 gap-6 h-[800px]">
            <div className="col-span-12 lg:col-span-9 flex flex-col gap-6 h-full">
                <div className="h-[600px] w-full border border-border rounded-lg shadow-sm bg-card overflow-hidden" style={{ contain: 'strict' }}>
                  <Chart />
                </div>
                <div className="h-[300px] grid grid-cols-2 gap-6">
                    <Card className="shadow-sm overflow-hidden">
                         <PositionsTable />
                    </Card>
                    <div className="overflow-hidden">
                         <TradeHistory />
                    </div>
                </div>
            </div>
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 h-full">
                <OrderPanel />
                <div className="flex-1 grid grid-rows-2 gap-6">
                    <DOMLadder />
                    <Tape />
                    <EquityCurve />
                </div>
            </div>
        </div>
      </main>
<VersionBadge />
    </div>
    </TradingAppWrapper>
  )
}