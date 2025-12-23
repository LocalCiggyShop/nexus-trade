import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import App from './App';
import ModeSelectionScreen from './components/ModeSelectionScreen';
import { useCoopModal, useMarketStore } from './store/marketStore';
import { useLobbyAutoJoin } from './components/AutoJoinLobby';
import { Toaster } from './components/ui/toaster';
import CoopPage from './components/CoopPage';
import CoopDraftingPage from './components/CoopDraftingPage';
import { supabase } from './lib/supabase';
import { useToast } from '@/hooks/use-toast'

function AppRoutes() {
    const navigate = useNavigate();
    const { toast } = useToast();
    useLobbyAutoJoin();

    const [showSettings, setShowSettings] = useState(false);
    const { setOpen: setShowCoopModal } = useCoopModal();
    const lobbyRoomId = useMarketStore(s => s.lobbyRoomId);
    
    // Use a ref to track the room status. This helps prevent redundant navigation 
    // and ensures the initial state check runs before the real-time listener takes over.
    const currentStatusRef = useRef<string | null>(null);
    const setIsHost = useMarketStore(s => s.setIsHost);

    // Helper function to determine the required path for a given status
    const getRequiredPath = (status: string) => {
        if (status === 'in-game') return '/coop';
        if (status === 'drafting') return '/coop-draft';
        if (status === 'lobby') return '/coop-hub';
        return '/'; // Default fallback
    };
    
    // --- EFFECT 1: Global Room Status Listener and Initial Check ---
    useEffect(() => {
        const marketStore = useMarketStore.getState();
        let isSubscribed = true; // Cleanup flag for async calls

        // 1. Handle no lobby room ID
        if (!lobbyRoomId) {
            currentStatusRef.current = null; 
            if (window.location.pathname === '/singleplayer') {
                // ⭐️ SINGLEPLAYER: THIS USER IS ALWAYS THE HOST ⭐️
                setIsHost(true); 
                marketStore.startSimulation();
            } else {
                setIsHost(false); // Default state
            }
            return;
        }

        // 2. Initial Status Check (Runs only once when lobbyRoomId changes or is set)
        const initialCheck = async () => {
            const currentPathOnCheck = window.location.pathname; 
            
            const { data: room, error } = await supabase
                .from('rooms')
                .select('status')
                .eq('id', lobbyRoomId)
                .single();
            
            if (!isSubscribed) return; // Component was unmounted

            if (error || !room) {
                 marketStore.setLobbyRoomId(null);
                 if (currentPathOnCheck !== '/') navigate('/', { replace: true });
                 return;
            }

            const requiredPath = getRequiredPath(room.status);
            currentStatusRef.current = room.status; // Set the initial status
            
            if (requiredPath !== currentPathOnCheck) {
                console.log(`[Router:Init] Navigating from ${currentPathOnCheck} to ${requiredPath} (status: ${room.status})`);
                if (room.status === 'in-game') {
                    // Assume the user who is initiating the navigation to /coop is the host 
                    // (This is a simplified assumption. A better approach requires checking 
                    // room metadata like 'host_id').
                    const isTheHost = true; // Replace with actual host check logic (e.g., check room.host_id against current user id)
                    
                    setIsHost(isTheHost); // Set the host status
                    marketStore.startSimulation();
                } else {
                    setIsHost(false);
                }
                navigate(requiredPath, { replace: true });
            } else {
                console.log(`[Router:Init] Status (${room.status}) matches current path (${currentPathOnCheck}). No navigation needed.`);
            }
        }
        initialCheck();
        
        // 3. Real-time Status Listener (Handles transitions from external updates)
        const channel = supabase.channel(`room_status_listener:${lobbyRoomId}`);
        
        channel.on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${lobbyRoomId}` },
            (payload: { new: { status: string } }) => {
                const newStatus = payload.new.status;
                
                // CRUCIAL CHECK: Only navigate if the status has actually changed
                // or if the current path is wrong for the new status.
                if (newStatus === currentStatusRef.current) {
                    return;
                }
                
                currentStatusRef.current = newStatus; // Update the reference
                
                const requiredPath = getRequiredPath(newStatus);
                const pathOnUpdate = window.location.pathname;
                
                if (requiredPath !== pathOnUpdate) {
                    console.log(`[Router:Subscription] Navigating from ${pathOnUpdate} to ${requiredPath} (status: ${newStatus})`);
                    
                    if (newStatus === 'in-game') {
                        // This should execute *before* the navigate call completes the route change.
                        marketStore.startSimulation(); 
                    }
                    navigate(requiredPath, { replace: true });
                }
            }
        ).subscribe();

        return () => {
             isSubscribed = false;
             // Cleanup the real-time channel
             supabase.removeChannel(channel);
        };
    }, [lobbyRoomId, navigate]); // Removed initialCheckDone

    // --- EFFECT 2: Player Exit Broadcast Listener (Unchanged, looks correct) ---
    useEffect(() => {
        if (!lobbyRoomId) return;

        const channel = supabase.channel(`room:${lobbyRoomId}`);
        
        channel
            .on(
                'broadcast', 
                { event: 'player_exit' },
                async (payload) => {
                    const { user_name, remaining_count } = payload.payload;
                    
                    toast({
                        title: 'Player Left!',
                        description: `${user_name} has left the room.`,
                        duration: 3000,
                    });

                    if (remaining_count <= 1) {
                        const marketStore = useMarketStore.getState();

                        const userResponse = await supabase.auth.getUser();
                        const currentAuthUser = userResponse.data.user;

                        if (currentAuthUser) {
                            const { error } = await supabase
                                .from('room_members')
                                .delete()
                                .eq('room_id', lobbyRoomId)
                                .eq('user_id', currentAuthUser.id);
                        }
                        
                        marketStore.setLobbyRoomId(null);
                        marketStore.setDraftedSymbols(null);
                        marketStore.stopSimulation();
                        navigate('/', { replace: true });
                    }
                }
            )
            .subscribe(); 

        return () => {
            supabase.removeChannel(channel);
        };
    }, [lobbyRoomId, toast, navigate]);

    // --- Handlers (Unchanged, looks correct) ---
    const handleExitApp = async () => { 
        const marketStore = useMarketStore.getState();
        const currentLobbyRoomId = marketStore.lobbyRoomId;

        if (currentLobbyRoomId) {
            const userResponse = await supabase.auth.getUser();
            const currentAuthUser = userResponse.data.user;

            if (!currentAuthUser) {
                marketStore.stopSimulation();
                navigate('/', { replace: true });
                return;
            }
            const currentAuthUserId = currentAuthUser.id;
            
            const { data: membersData } = await supabase
                .from('room_members')
                .select('user_id, user_name')
                .eq('room_id', currentLobbyRoomId);

            const exitingMember = membersData?.find(m => m.user_id === currentAuthUserId);
            const exitingUserName = exitingMember?.user_name || 'A player';
            
            const remainingMembersCount = (membersData?.length || 0) - 1; 

            const roomChannel = supabase.channel(`room:${currentLobbyRoomId}`);
            await roomChannel.send({
                type: 'broadcast',
                event: 'player_exit',
                payload: { 
                    user_id: currentAuthUserId,
                    user_name: exitingUserName,
                    remaining_count: remainingMembersCount
                },
            });
            await supabase.removeChannel(roomChannel);

            await supabase
                .from('room_members')
                .delete()
                .eq('room_id', currentLobbyRoomId)
                .eq('user_id', currentAuthUserId); 

            marketStore.setLobbyRoomId(null);
            marketStore.setDraftedSymbols(null);
            marketStore.stopSimulation();
            navigate('/', { replace: true });
        } else {
            marketStore.stopSimulation();
            navigate('/', { replace: true });
        }
    };

    const handleEnterCoop = () => {
        navigate('/coop-hub');
        setShowCoopModal(true);
    };

    const handleSelectMode = (mode: 'singleplayer' | 'coop') => {
        if (mode === 'singleplayer') {
            navigate('/singleplayer');
        } else {
            navigate('/coop-hub');
        }
    };

    // --- JSX Routes ---
    return (
        <>
            <Routes>
                <Route path="/" element={
                    <ModeSelectionScreen
                        onSelectMode={handleSelectMode}
                        onOpenSettings={() => setShowSettings(true)}
                        isSettingsOpen={showSettings}
                        onCloseSettings={() => setShowSettings(false)}
                    />
                } />
                
                <Route path="/singleplayer" element={
                    <App 
                        isCoop={false} 
                        onCoopClick={handleEnterCoop} 
                        onExitApp={handleExitApp} 
                    />
                } />
                
                <Route path="/coop-hub" element={<CoopPage />} />

                <Route path="/coop-draft" element={<CoopDraftingPage />} />

                <Route path="/coop" element={
                    <App 
                        isCoop={true} 
                        onCoopClick={handleEnterCoop} 
                        onExitApp={handleExitApp} 
                    />
                } />
            </Routes>
            
            <Toaster />
        </>
    );
}

export default function Router() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}