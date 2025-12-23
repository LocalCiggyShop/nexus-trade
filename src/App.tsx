import Chart from './components/Chart';
import OrderPanel from './components/OrderPanel';
import PositionsTable from './components/PositionsTable';
import DOMLadder from './components/DOMLadder';
import Tape from './components/Tape';
import Header from './components/Header';
import TradeHistory from './components/TradeHistory';
import { useMarketStore } from './store/marketStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ACTIVE_SYMBOLS } from "@/store/marketStore";
import WarningToast from './components/WarningToast';
import TradingAppWrapper from './components/Wrapper';
import EquityCurve from './components/EquityCurve';
import VersionBadge from './components/VersionBadge';
import CoopDraftingPage from './components/CoopDraftingPage';
import MarketNewsFeed from './components/MarketNewsFeed'; 
import CoopNewsController from './controllers/CoopNewsController';
import MarketStarter from './components/MarketStarter';


interface AppProps {
    isCoop: boolean;
    onCoopClick: () => void;
    onExitApp: () => void;
}

export default function App({ isCoop, onCoopClick, onExitApp }: AppProps) {

    // ⭐️ Retrieve new state variables and actions from the store
    const symbol = useMarketStore(s => s.symbol);
    const setSymbol = useMarketStore(s => s.setSymbol);
    const timeframe = useMarketStore(s => s.timeframe);
    const setTimeframe = useMarketStore(s => s.setTimeframe);
    const lobbyRoomId = useMarketStore(s => s.lobbyRoomId);
    const draftedSymbols = useMarketStore(s => s.draftedSymbols);
    // const stopSimulation = useMarketStore(s => s.stopSimulation); // Use to cleanup when exiting coop

    // ⭐️ Conditional Rendering Logic
    const isCoopDrafting = isCoop && lobbyRoomId && draftedSymbols === null;
    
    // The trading UI should render if:
    // 1. We are not in Co-op mode (Singleplayer).
    // 2. We are in Co-op mode AND the draft is complete (draftedSymbols is not null).
    const isSimulationActive = !isCoop || (isCoop && draftedSymbols !== null && draftedSymbols !== undefined);

    // ----------------------------------------------------------------
    // ⭐️ CO-OP ROUTING LOGIC
    // ----------------------------------------------------------------
    if (isCoopDrafting) {
        return <CoopDraftingPage />;
    }

    // ----------------------------------------------------------------
    // ⭐️ TRADING UI RENDERING
    // ----------------------------------------------------------------

    return (
        <TradingAppWrapper>
            <MarketStarter />
            <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
                
                {isSimulationActive && (
                    <>
                        <Header 
                            isCoop={isCoop} 
                            onCoopClick={onCoopClick} 
                            //@ts-ignore
                            onExitApp={onExitApp} 
                        />
                        <WarningToast />
                    </>
                )}
                
                {isSimulationActive && (
                    <>
                        <CoopNewsController />

                        <main className="mx-auto max-w-[1800px] p-6 space-y-6 my-4">
                            <div className="flex items-center justify-between">
                                <div className="flex gap-3">
                                    <Select value={symbol} onValueChange={setSymbol}>
                                        <SelectTrigger className="w-[180px] bg-card border-border shadow-sm h-10">
                                            <span className="text-muted-foreground mr-2 text-xs uppercase">Asset</span>
                                            <SelectValue placeholder="Symbol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(draftedSymbols ? Object.values(draftedSymbols).flat() : ACTIVE_SYMBOLS).map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    
                                    {/* TIMEFRAME SELECT */}
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
                                    <div className="flex-1 grid grid-rows-3 gap-6"> 
                                        {/* ⭐️ NEW: Add the Market News Feed here */}
                                        <MarketNewsFeed /> 
                                        
                                        <DOMLadder />
                                        <Tape />
                                        <EquityCurve />
                                    </div>
                                </div>
                            </div>
                        </main>
                    </>
                )}
                
                <VersionBadge />
                
            </div>
        </TradingAppWrapper>
    );
}

// import Chart from './components/Chart';
// import OrderPanel from './components/OrderPanel';
// import PositionsTable from './components/PositionsTable';
// import DOMLadder from './components/DOMLadder';
// import Tape from './components/Tape';
// import Header from './components/Header';
// import TradeHistory from './components/TradeHistory';
// import { useMarketStore } from './store/marketStore';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Card } from '@/components/ui/card';
// import { ACTIVE_SYMBOLS } from "@/store/marketStore";
// import WarningToast from './components/WarningToast';
// import TradingAppWrapper from './components/Wrapper';
// import EquityCurve from './components/EquityCurve';
// import VersionBadge from './components/VersionBadge';
// import CoopDraftingPage from './components/CoopDraftingPage';

// // ⭐️ Import the Coop specific pages

// interface AppProps {
//     isCoop: boolean;
//     onCoopClick: () => void;
//     onExitApp: () => void;
// }

// export default function App({ isCoop, onCoopClick, onExitApp }: AppProps) {

//     // ⭐️ Retrieve new state variables and actions from the store
//     const symbol = useMarketStore(s => s.symbol);
//     const setSymbol = useMarketStore(s => s.setSymbol);
//     const timeframe = useMarketStore(s => s.timeframe);
//     const setTimeframe = useMarketStore(s => s.setTimeframe);
//     const lobbyRoomId = useMarketStore(s => s.lobbyRoomId);
//     const draftedSymbols = useMarketStore(s => s.draftedSymbols);
//     const stopSimulation = useMarketStore(s => s.stopSimulation); // Use to cleanup when exiting coop

//     // ⭐️ Conditional Rendering Logic
//     const isCoopDrafting = isCoop && lobbyRoomId && draftedSymbols === null;
    
//     // The trading UI should render if:
//     // 1. We are not in Co-op mode (Singleplayer).
//     // 2. We are in Co-op mode AND the draft is complete (draftedSymbols is not null).
//     const isSimulationActive = !isCoop || (isCoop && draftedSymbols !== null && draftedSymbols !== undefined);

//     // ----------------------------------------------------------------
//     // ⭐️ CO-OP ROUTING LOGIC
//     // ----------------------------------------------------------------
//     if (isCoopDrafting) {
//         return <CoopDraftingPage />;
//     }

//     // ----------------------------------------------------------------
//     // ⭐️ TRADING UI RENDERING
//     // ----------------------------------------------------------------

//     return (
//         <TradingAppWrapper>
//             <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
                
//                 {/* Header and Warning Toast are only rendered if simulation is active */}
//                 {isSimulationActive && (
//                     <>
//                         <Header 
//                             isCoop={isCoop} 
//                             onCoopClick={onCoopClick} 
//                             //@ts-ignore
//                             onExitApp={onExitApp} 
//                         />
//                         <WarningToast />
//                     </>
//                 )}
                
//                 {isSimulationActive && (
//                     <main className="mx-auto max-w-[1800px] p-6 space-y-6 my-4">
//                         <div className="flex items-center justify-between">
//                             <div className="flex gap-3">
//                                 <Select value={symbol} onValueChange={setSymbol}>
//                                     <SelectTrigger className="w-[180px] bg-card border-border shadow-sm h-10">
//                                         <span className="text-muted-foreground mr-2 text-xs uppercase">Asset</span>
//                                         <SelectValue placeholder="Symbol" />
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                         {(draftedSymbols ? Object.values(draftedSymbols).flat() : ACTIVE_SYMBOLS).map(s => (
//                                             <SelectItem key={s} value={s}>{s}</SelectItem>
//                                         ))}
//                                     </SelectContent>
//                                 </Select>
                                
//                                 {/* TIMEFRAME SELECT */}
//                                 <Select value={timeframe} onValueChange={setTimeframe}>
//                                     <SelectTrigger className="w-[140px] bg-card border-border shadow-sm h-10">
//                                         <span className="text-muted-foreground mr-2 text-xs uppercase">Time</span>
//                                         <SelectValue placeholder="Timeframe" />
//                                     </SelectTrigger>
//                                     <SelectContent>
//                                         {["5s","15s","30s","1m","5m"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
//                                     </SelectContent>
//                                 </Select>
//                             </div>
//                             <div className="text-xs text-muted-foreground font-mono">
//                                 CONNECTED: <span className="text-emerald-500">STABLE</span>
//                             </div>
//                         </div>
//                         <div className="grid grid-cols-12 gap-6 h-[800px]">
//                             <div className="col-span-12 lg:col-span-9 flex flex-col gap-6 h-full">
//                                 <div className="h-[600px] w-full border border-border rounded-lg shadow-sm bg-card overflow-hidden" style={{ contain: 'strict' }}>
//                                     <Chart />
//                                 </div>
//                                 <div className="h-[300px] grid grid-cols-2 gap-6">
//                                     <Card className="shadow-sm overflow-hidden">
//                                         <PositionsTable />
//                                     </Card>
//                                     <div className="overflow-hidden">
//                                         <TradeHistory />
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 h-full">
//                                 <OrderPanel />
//                                 <div className="flex-1 grid grid-rows-2 gap-6">
//                                     <DOMLadder />
//                                     <Tape />
//                                     <EquityCurve />
//                                 </div>
//                             </div>
//                         </div>
//                     </main>
//                 )}
                
//                 <VersionBadge />
                
//             </div>
//         </TradingAppWrapper>
//     );
// }