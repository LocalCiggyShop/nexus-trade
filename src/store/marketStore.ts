import { create } from 'zustand'
import { produce } from 'immer'
import { persist } from 'zustand/middleware'

export interface SymbolConfig {
  mean: number
  startPrice: number
  baseVol: number
  tickSize: number
  commission: number
  marginRate: number
  minSize: number
  maxSize: number
}

const SYMBOL_CONFIG: Record<string, SymbolConfig> = {
  NEXUS: { mean: 503, startPrice: 502.35, baseVol: 1.2, tickSize: 0.01, commission: 200, marginRate: 0.03, minSize: 5, maxSize: 20000 },
  AXION: { mean: 85, startPrice: 85.5, baseVol: 1, tickSize: 0.01, commission: 50, marginRate: 0.02, minSize: 5, maxSize: 500 },
  HELIX: { mean: 503, startPrice: 502.35, baseVol: 1.2, tickSize: 0.01, commission: 500, marginRate: 0.03, minSize: 5, maxSize: 20000 },
}

export const ACTIVE_SYMBOLS = Object.keys(SYMBOL_CONFIG)

const FALLBACK: SymbolConfig = {
  mean: 500, startPrice: 500, baseVol: 1, tickSize: 0.05,
  commission: 5, marginRate: 0.05, minSize: 1, maxSize: 10000
}

const getConfig = (sym: string): SymbolConfig => ({
  ...FALLBACK,
  ...SYMBOL_CONFIG[sym]
})

export interface ProfileData {
  id: string
  name: string
  cash: number
  positions: Record<string, Position>
  tradeMarkers: Record<string, TradeMarker[]>
  history: UserTrade[]
  chartData: Record<string, any[]>
}

export interface Position {
  size: number
  avgPrice: number
  entryTime: number
  marginUsed: number
  stopLoss?: number
  takeProfit?: number
}

export interface DOMLevel {
  price: number
  bidSize: number
  askSize: number
}

export type UserTrade = {
  id: string
  time: string
  sym: string
  side: 'LONG' | 'SHORT'
  size: number
  entryPrice: number
  exitPrice: number
  entryTime: number
  exitTime: number
  pnl: number
  commission: number
  netPnL: number
}

export type TradeMarker = {
  time: number
  price: number
  type: 'entry' | 'exit'
  side: 'LONG' | 'SHORT'
  size: number
}

interface MarketState {
  activeProfileId: string
  profiles: ProfileData[]
  symbol: string
  timeframe: string
  priceData: Record<string, number>
  domLevels: Record<string, DOMLevel[]>
  tape: Array<{ time: string; sym: string; side: string; size: number; price: string; isUser: boolean }>
  volatilityMultiplier: number

  resetChartForActiveProfile: () => void

  errorQueue: Array<{ id: string; message: string; type: 'error' | 'info' }>
  pushWarning: (msg: string, type?: 'error' | 'info') => void
  dismissWarning: () => void

  createProfile: (name: string) => void
  deleteProfile: (id: string) => void
  switchProfile: (id: string) => void
  setSymbol: (s: string) => void
  setTimeframe: (t: string) => void
  executeOrder: (side: 'BUY' | 'SELL', qty: number, sl?: number, tp?: number) => void
  closePosition: (sym: string) => void
  startSimulation: () => () => void
}

const getCurrentCandleTime = (tf: string): number => {
  const now = Math.floor(Date.now() / 1000)
  const map: Record<string, number> = { '5s': 5, '15s': 15, '30s': 30, '1m': 60, '5m': 300 }
  const seconds = map[tf] ?? 60
  return Math.floor(now / seconds) * seconds
}

const simulateLiquidity = (currentPrice: number, volMult: number, sym: string) => {
  const cfg = getConfig(sym)
  const center = Math.round(currentPrice / cfg.tickSize) * cfg.tickSize
  const drift = (cfg.mean - currentPrice) * 0.0005
  const jump = (Math.random() - 0.5) * 0.05 * volMult * cfg.baseVol
  let newPrice = Math.max(10, Math.round((currentPrice + drift + jump) / cfg.tickSize) * cfg.tickSize)

  const levels: DOMLevel[] = []
  for (let i = 1; i <= 5; i++) {
    const base = 5000 + Math.abs(Math.sin(Date.now() / 30000 + i) * 3000) + Math.random() * 10000
    levels.push({ price: center + i * cfg.tickSize, bidSize: 0, askSize: Math.max(1000, base * (1 + Math.random() * 0.5)) })
    levels.push({ price: center - i * cfg.tickSize, bidSize: Math.max(1000, base * (1 + Math.random() * 0.5)), askSize: 0 })
  }
  levels.sort((a, b) => b.price - a.price)

  const volume = Math.floor(Math.random() * 2000 * volMult) + 500
  const side = newPrice > currentPrice ? 'BUY' : 'SELL'
  return { price: newPrice, volume, side, dom: levels }
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      activeProfileId: 'default',
      profiles: [{
        id: 'default',
        name: 'Main Account',
        cash: 100000,
        positions: {},
        tradeMarkers: {},
        history: [],
        chartData: {},
      }],
      errorQueue: [],
      symbol: 'NEXUS',
      timeframe: '5s',
      priceData: {},
      domLevels: {},
      tape: [],
      volatilityMultiplier: 1.0,

      createProfile: (name: string) => set(state => {
        if (state.profiles.length >= 5) return state
        const newProfile: ProfileData = {
          id: Date.now().toString(),
          name,
          cash: 100000,
          positions: {},
          tradeMarkers: {},
          history: [],
          chartData: {},
        }
        return { profiles: [...state.profiles, newProfile] }
      }),

      deleteProfile: (id: string) => set(state => {
        if (state.profiles.length <= 1) return state
        const filtered = state.profiles.filter(p => p.id !== id)
        const newActive = state.activeProfileId === id ? filtered[0].id : state.activeProfileId
        return { profiles: filtered, activeProfileId: newActive }
      }),

      switchProfile: (id: string) => set(state => {
        const exists = state.profiles.some(p => p.id === id)
        if (!exists) return state

        return {
          activeProfileId: id,
          priceData: {},
          domLevels: {},
          tape: [],
        }
      }),

      pushWarning: (msg: string, type: 'error' | 'info' = 'error') =>
        set(state => ({
          errorQueue: [
            ...state.errorQueue,
            { id: Date.now().toString(), message: msg, type }
          ].slice(-5)
        })),

      dismissWarning: () =>
        set(state => ({
          errorQueue: state.errorQueue.slice(1)
        })),

      setSymbol: (s: string) => set({ symbol: s }),
      setTimeframe: (t: string) => set({ timeframe: t }),

      executeOrder: (side: 'BUY' | 'SELL', qty: number, sl?: number, tp?: number) =>
      set(
        produce((draft) => {
          const profile = draft.profiles.find((p: any) => p.id === draft.activeProfileId ? p.id === draft.activeProfileId : false)!
          const sym = draft.symbol
          const cfg = getConfig(sym)
          const price = draft.priceData[sym]
          if (!price || qty <= 0 || qty < cfg.minSize || qty > cfg.maxSize) return

          const signedQty = side === 'BUY' ? qty : -qty
          const existing = profile.positions[sym]

          // Close opposite direction
          if (existing && Math.sign(existing.size) !== Math.sign(signedQty)) {
            const closeSize = Math.min(Math.abs(existing.size), qty)
            const pnl = closeSize * (price - existing.avgPrice) * Math.sign(existing.size)
            profile.cash += pnl - cfg.commission

            profile.history.unshift({
              id: Math.random().toString(36),
              time: new Date().toLocaleTimeString(),
              sym,
              side: existing.size > 0 ? 'LONG' : 'SHORT',
              size: closeSize,
              entryPrice: existing.avgPrice,
              exitPrice: price,
              entryTime: existing.entryTime,
              exitTime: Date.now(),
              pnl,
              commission: cfg.commission,
              netPnL: pnl - cfg.commission,
            })
          }

          const newSize = (existing?.size || 0) + signedQty

          if (newSize === 0) {
            delete profile.positions[sym]
          } else {
            const avgPrice =
              existing && Math.sign(existing.size) === Math.sign(newSize)
                ? (existing.size * existing.avgPrice + signedQty * price) / newSize
                : price

            profile.positions[sym] = {
              size: newSize,
              avgPrice,
              entryTime: existing?.entryTime ?? Date.now(),
              marginUsed: Math.abs(newSize * price) * cfg.marginRate,
              stopLoss: sl,
              takeProfit: tp,
            }
          }

          profile.tradeMarkers[sym] ??= []
          profile.tradeMarkers[sym].push({
            time: getCurrentCandleTime(draft.timeframe),
            price,
            type: 'entry',
            side: newSize > 0 ? 'LONG' : 'SHORT',
            size: Math.abs(qty),
          })
        })
      ),

      closePosition: (sym: string) => set(produce(draft => {
        let profile = draft.profiles.find((p: any) => p.id === draft.activeProfileId)
        if (!profile) {
          profile = draft.profiles[0] ?? {
            id: 'default',
            name: 'Main Account',
            cash: 100000,
            positions: {},
            tradeMarkers: {},
            history: [],
            chartData: {},
          }
          if (!draft.profiles.length) {
            draft.profiles.push(profile)
          }
          draft.activeProfileId = profile.id
        }
        const pos = profile.positions[sym]
        if (!pos) return
        const price = draft.priceData[sym]
        const cfg = getConfig(sym)
        const pnl = (price - pos.avgPrice) * pos.size
        profile.cash += pnl - cfg.commission

        profile.history.unshift({
          id: Math.random().toString(36),
          time: new Date().toLocaleTimeString(),
          sym,
          side: pos.size > 0 ? 'LONG' : 'SHORT',
          size: Math.abs(pos.size),
          entryPrice: pos.avgPrice,
          exitPrice: price,
          entryTime: pos.entryTime,
          exitTime: Date.now(),
          pnl: pnl - cfg.commission,
          commission: cfg.commission,
          netPnL: pnl - cfg.commission,
        })

        delete profile.positions[sym]

        profile.tradeMarkers[sym] ??= []
        profile.tradeMarkers[sym].push({
          time: getCurrentCandleTime(draft.timeframe),
          price,
          type: 'exit',
          side: pos.size > 0 ? 'LONG' : 'SHORT',
          size: Math.abs(pos.size),
        })
      })),

      startSimulation: (): (() => void) => {
  ACTIVE_SYMBOLS.forEach(sym => {
    const cfg = getConfig(sym)
    set(produce(draft => {
      draft.priceData[sym] = cfg.startPrice
      draft.domLevels[sym] = []

      let profile = draft.profiles.find((p: any) => p.id === draft.activeProfileId)
      if (!profile) {
        profile = draft.profiles[0] ?? {
          id: 'default',
          name: 'Main Account',
          cash: 100000,
          positions: {},
          tradeMarkers: {},
          history: [],
          chartData: {},
        }
        if (!draft.profiles.length) {
          draft.profiles.push(profile)
        }
        draft.activeProfileId = profile.id
      }
      profile.chartData ??= {}
      profile.chartData[sym] ??= []
    }))
  })

  let timer: NodeJS.Timeout

  const tick = () => {
    const state = get()
    const now = Date.now()
    const sec = Math.floor(now / 1000)

    ACTIVE_SYMBOLS.forEach(sym => {
      const curPrice = state.priceData[sym] ?? 500
      const { price: newPrice, volume, side, dom } = simulateLiquidity(curPrice, state.volatilityMultiplier, sym)

      set(produce(draft => {
        draft.priceData[sym] = newPrice
        draft.domLevels[sym] = dom

        let profile = draft.profiles.find((p: any) => p.id === draft.activeProfileId)
        if (!profile) {
          profile = draft.profiles[0] ?? {
            id: 'default',
            name: 'Main Account',
            cash: 100000,
            positions: {},
            tradeMarkers: {},
            history: [],
            chartData: {},
          }
          if (!draft.profiles.length) {
            draft.profiles.push(profile)
          }
          draft.activeProfileId = profile.id
        }
        profile.chartData ??= {}
        profile.chartData[sym] ??= []

        const candles = profile.chartData[sym]
        candles.push({ time: sec, open: curPrice, high: Math.max(curPrice, newPrice), low: Math.min(curPrice, newPrice), close: newPrice, volume })
        // if (candles.length > 5000) candles.shift()
        if (candles.length > 1000) candles.splice(0, candles.length - 1000)

        if (volume > 500 && state.symbol === sym) {
          draft.tape.unshift({
            time: new Date().toLocaleTimeString() + '.' + String(now % 1000).padStart(3, '0'),
            sym, side, size: volume, price: newPrice.toFixed(3), isUser: false,
          })
          if (draft.tape.length > 200) draft.tape.pop()
        }
      }))
    })

    timer = setTimeout(tick, 50)
  }

  setTimeout(tick, 100)
  return () => clearTimeout(timer)
      },

      resetChartForActiveProfile: () => set(state => {
        const profile = state.profiles.find(p => p.id === state.activeProfileId)
        if (!profile) return state

        return {
          priceData: {},
          domLevels: {},
          tape: [],
        }
      }),
    }),
    {
      name: 'trading-profiles-v1',
      partialize: (state) => ({
        activeProfileId: state.activeProfileId,
        profiles: state.profiles.map(p => ({
          id: p.id,
          name: p.name,
          cash: p.cash,
          positions: p.positions,
          tradeMarkers: p.tradeMarkers,
          history: p.history,
          chartData: p.chartData,
        })),
      }),
    }
  )
)

export const useActiveProfile = () => {
  const { activeProfileId, profiles } = useMarketStore()
  return profiles.find(p => p.id === activeProfileId) ?? profiles[0]
}

export const useProfileActions = () => {
  const { createProfile, deleteProfile, switchProfile } = useMarketStore()
  return { createProfile, deleteProfile, switchProfile }
}

export const useTradingData = () => {
  const profile = useActiveProfile()
  const { priceData, domLevels, symbol } = useMarketStore()
  return { cash: profile.cash, positions: profile.positions, priceData, domLevels, symbol }
}

export { getConfig }