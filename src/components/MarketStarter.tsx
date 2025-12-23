import { useEffect, useRef } from 'react';
import { useMarketStore } from '@/store/marketStore';

export default function MarketStarter() {
    const startSimulation = useMarketStore(s => s.startSimulation);
    const lobbyRoomId = useMarketStore(s => s.lobbyRoomId);
    
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (hasStartedRef.current) {
            return;
        }

        const clearNews = !!lobbyRoomId; 
        
        console.log("MarketStarter: Starting simulation on mount...");
        startSimulation(clearNews);

        hasStartedRef.current = true; 
        
    }, [startSimulation, lobbyRoomId]);

    return null; 
}