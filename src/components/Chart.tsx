import { useEffect, useRef, useState, useMemo } from 'react'
import { useActiveProfile, useMarketStore } from '@/store/marketStore'
import { Settings as SettingsIcon, X as CloseIcon } from 'lucide-react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  Time,
  CandlestickData,
  CandlestickSeries,
  AreaSeries,
  SeriesMarker,
  createSeriesMarkers,
} from 'lightweight-charts'

export default function Chart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [volumeSeries, setVolumeSeries] = useState<ISeriesApi<'Area'> | null>(null)
  const positionLineRef = useRef<IPriceLine | null>(null)

  const [showSettings, setShowSettings] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [autoFit, setAutoFit] = useState(true)
  const [showTradeMarkers, setShowTradeMarkers] = useState(() => {
    const saved = localStorage.getItem('chart.showTradeMarkers')
    return saved === null ? false : saved === 'true'
  })

  const timeframe = useMarketStore(s => s.timeframe)

  const profile = useActiveProfile()
  const { symbol, priceData } = useMarketStore()

  const positions = profile.positions
  const chartDataMap = profile.chartData
  const tradeMarkersFull = profile.tradeMarkers
  const rawTicks = chartDataMap[symbol] || []
  const tradeMarkers = useMemo(() => tradeMarkersFull?.[symbol] ?? [], [tradeMarkersFull, symbol])
  const currentPrice = priceData[symbol] ?? 500
  const position = positions[symbol]

  const tfSeconds = useMemo(() => {
    const map: Record<string, number> = { '5s': 5, '15s': 15, '30s': 30, '1m': 60, '5m': 300 }
    return map[timeframe] ?? 60
  }, [timeframe])

  const candles = useMemo((): (CandlestickData & { volume?: number })[] => {
    if (rawTicks.length === 0) return []
    const map = new Map<number, CandlestickData & { volume: number }>()

    rawTicks.forEach(t => {
      const bucket = Math.floor(t.time / tfSeconds) * tfSeconds
      const existing = map.get(bucket) || {
        time: bucket as Time,
        open: t.close,
        high: t.close,
        low: t.close,
        close: t.close,
        volume: 0,
      }
      existing.high = Math.max(existing.high, t.close)
      existing.low = Math.min(existing.low, t.close)
      existing.close = t.close
      existing.volume += t.volume || 0
      map.set(bucket, existing)
    })

    const now = Math.floor(Date.now() / 1000)
    const liveBucket = Math.floor(now / tfSeconds) * tfSeconds
    const last = rawTicks[rawTicks.length - 1]
    if (last) {
      const live = map.get(liveBucket) || {
        time: liveBucket as Time,
        open: last.close,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: 0,
      }
      live.close = currentPrice
      live.high = Math.max(live.high, currentPrice)
      live.low = Math.min(live.low, currentPrice)
      map.set(liveBucket, live)
    }

    return Array.from(map.values()).slice(-500)
  }, [rawTicks, currentPrice, tfSeconds])

  const isDark = document.documentElement.classList.contains('dark')

  useEffect(() => {
    localStorage.setItem('chart.showTradeMarkers', String(showTradeMarkers))
  }, [showTradeMarkers])

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: { attributionLogo: false, background: { color: 'transparent' }, textColor: isDark ? '#ddd' : '#222' },
      grid: {
        vertLines: { color: showGrid ? (isDark ? '#333' : '#e0e0e0') : 'transparent' },
        horzLines: { color: showGrid ? (isDark ? '#333' : '#e0e0e0') : 'transparent' },
      },
      timeScale: { timeVisible: true, secondsVisible: tfSeconds < 60 },
      rightPriceScale: { borderColor: 'transparent' },
      crosshair: { mode: 1 },
    })
    chartRef.current = chart

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981', downColor: '#ef4444', borderVisible: false,
      wickUpColor: '#10b981', wickDownColor: '#ef4444',
    })
    
    candlestickSeriesRef.current = candle as ISeriesApi<'Candlestick'>

    const vol = chart.addSeries(AreaSeries, {
      topColor: 'rgba(14,165,233,0.1)', bottomColor: 'rgba(14,165,233,0)',
      lineColor: 'transparent', priceScaleId: 'volume',
    })
    setVolumeSeries(vol as ISeriesApi<'Area'>)
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })

    const handleResize = () => chart.applyOptions({
      width: containerRef.current!.clientWidth,
      height: containerRef.current!.clientHeight,
    })
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [isDark, tfSeconds, showGrid, symbol])

  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return
    if (autoFit) {
      chartRef.current.timeScale().fitContent()
    }
  }, [autoFit, candles])

  useEffect(() => {
    const series = candlestickSeriesRef.current
    if (!series || candles.length === 0) return

    series.setData(candles)

    // MARKERS – arrows for entry/exit
    const markers: SeriesMarker<Time>[] = tradeMarkers.map(m => ({
      time: m.time as Time,
      position: m.type === 'entry' ? 'belowBar' : 'aboveBar',
      color: m.side === 'LONG' ? '#10b981' : '#ef4444',
      shape: m.type === 'entry' ? 'arrowUp' : 'arrowDown', 
      text: m.type === 'entry' ? m.side === 'LONG' ? 'LONG' : 'SHORT' : 'EXIT',
      size: 1,
    }))

    // createSeriesMarkers(series, markers)

    if (showTradeMarkers && tradeMarkers.length > 0) {
      createSeriesMarkers(series, markers)
    } else {
      createSeriesMarkers(series, [])
    }

    // ENTRY PRICE LINE
    if (positionLineRef.current) {
      series.removePriceLine(positionLineRef.current)
    }
    if (position) {
      positionLineRef.current = series.createPriceLine({
        price: position.avgPrice,
        color: position.size > 0 ? '#10b981' : '#ef4444',
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: position.size > 0 ? 'LONG ENTRY' : 'SHORT ENTRY',
      })
    } else {
      positionLineRef.current = null
    }

    volumeSeries?.setData(candles.map(c => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
    })))

    if (autoFit) chartRef.current?.timeScale().fitContent()
    chartRef.current?.timeScale().scrollToRealTime()
  }, [candles, tradeMarkers, position, autoFit, volumeSeries])

  return (
    <div className="relative w-full h-full bg-card rounded-lg overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-4 left-6 z-10 pointer-events-none">
        <h2 className="text-3xl font-bold text-foreground">{symbol}</h2>
        <div className="text-sm font-mono text-muted-foreground">{timeframe} • LIVE</div>
      </div>

      <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-background/90 backdrop-blur hover:bg-background transition-colors">
        <SettingsIcon className="w-5 h-5" />
      </button>

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-start justify-end p-4 bg-black/30">
          <div className="bg-card p-4 rounded-lg shadow-2xl border border-border w-64">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Chart Options</h3>
              <button onClick={() => setShowSettings(false)}><CloseIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">Show Grid</span>
                <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="w-4 h-4 text-primary rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">Auto Fit</span>
                <input type="checkbox" checked={autoFit} onChange={e => setAutoFit(e.target.checked)} className="w-4 h-4 text-primary rounded" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Show Trade Markers</span>
              <input
                type="checkbox"
                checked={showTradeMarkers}
                onChange={e => setShowTradeMarkers(e.target.checked)}
                className="w-4 h-4 text-primary rounded"
              />
            </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}