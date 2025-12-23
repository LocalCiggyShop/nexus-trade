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
    // TIER 1: FAST & HIGH VOLUME (High BaseVol, Low Commission, High MaxSize)
    AXION: { mean: 85, startPrice: 85.50, baseVol: 1.8, tickSize: 0.01, commission: 5, marginRate: 0.01, minSize: 100, maxSize: 10000 },
    
    // TIER 2: SLOW & LOW VOLUME (Low BaseVol, High Commission, Low MaxSize)
    HELIX: { mean: 500, startPrice: 502.35, baseVol: 0.8, tickSize: 0.01, commission: 500, marginRate: 0.05, minSize: 5, maxSize: 1000 },
    BONG: { mean: 500, startPrice: 502.35, baseVol: 0.5, tickSize: 0.01, commission: 1000, marginRate: 0.10, minSize: 1, maxSize: 500 },
    COLLING: { mean: 500, startPrice: 502.35, baseVol: 1.0, tickSize: 0.01, commission: 250, marginRate: 0.03, minSize: 10, maxSize: 5000 },
    WOOD: { mean: 500, startPrice: 502.35, baseVol: 0.6, tickSize: 0.01, commission: 750, marginRate: 0.07, minSize: 1, maxSize: 1000 },
    NEXUS: { mean: 500, startPrice: 502.35, baseVol: 2.5, tickSize: 0.01, commission: 10, marginRate: 0.01, minSize: 100, maxSize: 50000 },
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

export interface MarketNews {
    id: string
    time: number
    headline: string
    // An array of symbols this news affects. 'GLOBAL' affects all.
    targets: string[] | ['GLOBAL'] 
    // Price change factor for the next N seconds. Positive for bullish, negative for bearish.
    priceDrift: number 
    // Volatility change factor. A multiplier (e.g., 2.0 doubles current volatility).
    volatilityMultiplier: number 
    // Duration in seconds for the effect to persist
    duration: number 
}

export const NEWS_EVENTS: Omit<MarketNews, 'id' | 'time'>[] = [
    // Global Events
    { headline: 'GLOBAL: Unexpected Rate Cut Boosts Sentiment!', targets: ['NEXUS'], priceDrift: 0.08, volatilityMultiplier: 0.5, duration: 60 },
    { headline: 'GLOBAL: Geopolitical Tension Spikes Fear Index!', targets: ['NEXUS'], priceDrift: -0.1, volatilityMultiplier: 2.5, duration: 45 },
    
    // NEXUS Specific Events (Fast/High Volume)
    { headline: 'NEXUS: Breakthrough AI Patent Announced!', targets: ['NEXUS'], priceDrift: 0.15, volatilityMultiplier: 1.0, duration: 30 },
    { headline: 'NEXUS: Regulator Launches Investigation!', targets: ['NEXUS'], priceDrift: -0.2, volatilityMultiplier: 3.0, duration: 45 },

    // AXION Specific Events (Mid-Volume)
    { headline: 'AXION: Major Partnership Signed!', targets: ['NEXUS'], priceDrift: 0.1, volatilityMultiplier: 1.5, duration: 25 },

    // HELIX Specific Events (Slow/Low Volume)
    { headline: 'HELIX: Production Halted Due to Supply Chain Issues', targets: ['HELIX'], priceDrift: -0.05, volatilityMultiplier: 2.0, duration: 50 },
    
    // Sector-Wide (e.g., Tier 1 assets)
    { headline: 'TIER 1: Crypto Market Spikes, Lifting Related Assets', targets: ['NEXUS', 'AXION'], priceDrift: 0.07, volatilityMultiplier: 1.2, duration: 60 },
]

export interface ProfileData {
    id: string
    name: string
    cash: number
    positions: Record<string, Position>
    tradeMarkers: Record<string, TradeMarker[]>
    history: UserTrade[]
    chartData: Record<string, any[]>
}

let simulationTimer: NodeJS.Timeout | null = null; 

interface MarketState {
    activeProfileId: string
    profiles: ProfileData[]
    symbol: string
    timeframe: string
    priceData: Record<string, number>
    domLevels: Record<string, DOMLevel[]>
    tape: Array<{ time: string; sym: string; side: string; size: number; price: string; isUser: boolean }>
    volatilityMultiplier: number
    coopModalOpen: boolean,
    lobbyRoomId: string | null;
    draftedSymbols: Record<string, string[]> | null;
    isHost: boolean;
    
    simulationIntervalMs: number;
    showNameInCoop: boolean;

    activeNews: MarketNews[]; 

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
    startSimulation: (clearNews?: boolean) => void
    stopSimulation: () => void
    setCoopModalOpen: (open: boolean) => void
    setLobbyRoomId: (id: string | null) => void
    setIsHost: (isHost: boolean) => void;
    addRemoteNews: (news: MarketNews) => void;

    toggleShowNameInCoop: () => void;
    setDraftedSymbols: (picks: Record<string, string[]> | null) => void;
}

const getCurrentCandleTime = (tf: string): number => {
    const now = Math.floor(Date.now() / 1000)
    const map: Record<string, number> = { '5s': 5, '15s': 15, '30s': 30, '1m': 60, '5m': 300 }
    const seconds = map[tf] ?? 60
    return Math.floor(now / seconds) * seconds
}

const calculateSimulationInterval = (sym: string): number => {
    const cfg = getConfig(sym);
    const MAX_BASE_VOL = 2.5; 
    const MIN_INTERVAL = 50;  
    const MAX_INTERVAL = 250; 
    
    const normalizedVol = Math.min(cfg.baseVol, MAX_BASE_VOL) / MAX_BASE_VOL;
    const newInterval = 
      MAX_INTERVAL - (MAX_INTERVAL - MIN_INTERVAL) * normalizedVol;

    return Math.round(newInterval);
};

const simulateLiquidity = (currentPrice: number, volMult: number, sym: string, activeNews: MarketNews[]) => {
    const cfg = getConfig(sym)

    let newsPriceDrift = 0;
    let newsVolMult = 1.0;

    activeNews.forEach(news => {
        const isGlobal = news.targets.includes('GLOBAL');
        //@ts-ignore
        const isTargeted = news.targets.includes(sym);

        if (isGlobal || isTargeted) {
            newsPriceDrift += news.priceDrift;
            newsVolMult *= news.volatilityMultiplier;
        }
    });

    const totalVolatilityMultiplier = volMult * newsVolMult;

    const center = Math.round(currentPrice / cfg.tickSize) * cfg.tickSize
    const baseDrift = (cfg.mean - currentPrice) * 0.0005
    const noise = (Math.random() - 0.5) * 0.05 * totalVolatilityMultiplier * cfg.baseVol
    
    const delta = baseDrift + noise + newsPriceDrift * cfg.tickSize * 10 // scale news drift for impact
    
    let newPrice = Math.max(10, Math.round((currentPrice + delta) / cfg.tickSize) * cfg.tickSize)

    const levels: DOMLevel[] = []
    for (let i = 1; i <= 5; i++) {
        const base = 5000 + Math.abs(Math.sin(Date.now() / 30000 + i) * 3000) + Math.random() * 10000
        const size = Math.max(1000, base * (1 + Math.random() * 0.5) * totalVolatilityMultiplier)
        levels.push({ price: center + i * cfg.tickSize, bidSize: 0, askSize: size })
        levels.push({ price: center - i * cfg.tickSize, bidSize: size, askSize: 0 })
    }
    levels.sort((a, b) => b.price - a.price)

    const volume = Math.floor(Math.random() * 2000 * totalVolatilityMultiplier) + 500
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
            coopModalOpen: false,
            lobbyRoomId: null,
            draftedSymbols: null,
            isHost: false,

            simulationIntervalMs: calculateSimulationInterval('NEXUS'), 
            showNameInCoop: true,

            activeNews: [],

            setIsHost: (isHost: boolean) => set({ isHost }),
            addRemoteNews: (news: MarketNews) => set(
                produce(draft => {
                    draft.activeNews.push(news);
                    
                    draft.errorQueue = [
                        ...draft.errorQueue,
                        { id: news.id, message: news.headline, type: 'info' }
                    ].slice(-5); 
                })
            ),

            setDraftedSymbols: (picks: Record<string, string[]> | null) => set({
                draftedSymbols: picks,
            }),

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
                    activeNews: [], 
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

            setSymbol: (s: string) => {
                const nextInterval = calculateSimulationInterval(s);

                set({ symbol: s, simulationIntervalMs: nextInterval });

                if (simulationTimer) {
                    clearTimeout(simulationTimer);
                    simulationTimer = null;
                    get().startSimulation(false); 
                }
            },
            
            setTimeframe: (t: string) => set({ timeframe: t }),
            setCoopModalOpen: (open: boolean) => set({ coopModalOpen: open }), 
            setLobbyRoomId: (id: string | null) => set({ lobbyRoomId: id }),
            
            toggleShowNameInCoop: () => set(state => ({
                showNameInCoop: !state.showNameInCoop
            })),

            executeOrder: (side: 'BUY' | 'SELL', qty: number, sl?: number, tp?: number) =>
                set(
                    produce((draft) => {
                        const profile = draft.profiles.find((p: any) => p.id === draft.activeProfileId)
                        if (!profile) return
                        
                        const sym = draft.symbol
                        const cfg = getConfig(sym)
                        const price = draft.priceData[sym]
                        if (!price || qty <= 0 || qty < cfg.minSize || qty > cfg.maxSize) return

                        const signedQty = side === 'BUY' ? qty : -qty
                        const existing = profile.positions[sym]

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
                if (!profile) return 

                const pos = profile.positions[sym]
                if (!pos) return
                const price = draft.priceData[sym]
                const cfg = getConfig(sym)
                const pnl = (price - pos.avgPrice) * pos.size
                profile.cash += pnl - cfg.commission

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

            startSimulation: (clearNews = true) => {
                if (simulationTimer) {
                    clearTimeout(simulationTimer);
                    simulationTimer = null;
                }

                const state = get(); 
                
                const draftedSymbols = state.draftedSymbols 
                    ? Object.values(state.draftedSymbols).flat() 
                    : [];
                
                const symbolsToSimulate = draftedSymbols.length > 0 
                    ? draftedSymbols 
                    : ACTIVE_SYMBOLS;

                let newSymbol = state.symbol || 'NEXUS'; 
                if (draftedSymbols.length > 0 && !state.symbol) {
                    newSymbol = draftedSymbols[0];
                }

                const initialInterval = calculateSimulationInterval(newSymbol);

                set(produce(draft => {
                    draft.symbol = newSymbol;
                    draft.timeframe = '5s'; 
                    draft.simulationIntervalMs = initialInterval;
                    
                    if (clearNews) {
                        draft.activeNews = []; 
                    }
                }));
                
                symbolsToSimulate.forEach(sym => {
                    const cfg = getConfig(sym)
                    set(produce(draft => {
                        draft.priceData[sym] = cfg.startPrice
                        draft.domLevels[sym] = []
                        let profile = draft.profiles.find((p: any) => p.id === draft.activeProfileId)
                        if (!profile) return
                        profile.chartData ??= {}
                    }))
                })

                const tick = () => {
                    const state = get()
                    const now = Date.now()
                    const sec = Math.floor(now / 1000)

                    set(produce(draft => {
                        //@ts-ignore
                        draft.activeNews = draft.activeNews.filter(news => news.time + news.duration * 1000 > now);
                    }));

                    const currentSymbol = state.symbol;
                    const nextInterval = calculateSimulationInterval(currentSymbol);

                    if (state.simulationIntervalMs !== nextInterval) {
                        set({ simulationIntervalMs: nextInterval });
                    }

                    const currentDraftedSymbols = state.draftedSymbols 
                        ? Object.values(state.draftedSymbols).flat() 
                        : []; 
                    
                    const symbolsToProcess = currentDraftedSymbols.length > 0 
                        ? currentDraftedSymbols 
                        : ACTIVE_SYMBOLS;

                    symbolsToProcess.forEach(sym => {
                        const curPrice = state.priceData[sym] ?? getConfig(sym).startPrice
                        
                        const { price: newPrice, volume, side, dom } = simulateLiquidity(
                            curPrice, 
                            state.volatilityMultiplier, 
                            sym, 
                            state.activeNews
                        )

                        set(produce(draft => {
                            draft.priceData[sym] = newPrice
                            draft.domLevels[sym] = dom

                            let profile = draft.profiles.find((p: any) => p.id === draft.activeProfileId)
                            if (!profile) return

                            profile.chartData ??= {}
                            profile.chartData[sym] ??= []

                            const candles = profile.chartData[sym]
                            
                            candles.push({ time: sec, open: curPrice, high: Math.max(curPrice, newPrice), low: Math.min(curPrice, newPrice), close: newPrice, volume })
                            
                            if (candles.length > 1000) candles.splice(0, candles.length - 1000)

                            if (volume > 500 && draft.symbol === sym) { 
                                draft.tape.unshift({
                                    time: new Date().toLocaleTimeString() + '.' + String(now % 1000).padStart(3, '0'),
                                    sym, side, size: volume, price: newPrice.toFixed(3), isUser: false,
                                })
                                if (draft.tape.length > 200) draft.tape.pop()
                            }
                        }))
                    })

                    simulationTimer = setTimeout(tick, nextInterval) as NodeJS.Timeout
                }
                
                simulationTimer = setTimeout(tick, initialInterval) as NodeJS.Timeout
            },
            
            stopSimulation: () => {
                if (simulationTimer) {
                    clearTimeout(simulationTimer);
                    simulationTimer = null;
                }

                set({
                    priceData: {},
                    domLevels: {},
                    tape: [],
                    activeNews: [],
                    simulationIntervalMs: calculateSimulationInterval('NEXUS'), 
                });
            },

            resetChartForActiveProfile: () => set(state => {
                const profile = state.profiles.find(p => p.id === state.activeProfileId)
                if (!profile) return state

                return {
                    priceData: {},
                    domLevels: {},
                    tape: [],
                    activeNews: [],
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
                showNameInCoop: state.showNameInCoop,
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
    const { priceData, domLevels, symbol, simulationIntervalMs } = useMarketStore()
    return { cash: profile.cash, positions: profile.positions, priceData, domLevels, symbol, simulationIntervalMs }
}

export const useCoopModal = () => {
    const coopModalOpen = useMarketStore(s => s.coopModalOpen)
    const setCoopModalOpen = useMarketStore(s => s.setCoopModalOpen)
    return { open: coopModalOpen, setOpen: setCoopModalOpen }
}

export const useCoopSettings = () => {
    const showNameInCoop = useMarketStore(s => s.showNameInCoop);
    const toggleShowNameInCoop = useMarketStore(s => s.toggleShowNameInCoop);
    return { showNameInCoop, toggleShowNameInCoop };
}

export const useActiveNews = () => {
    return useMarketStore(s => s.activeNews);
}

export { getConfig }