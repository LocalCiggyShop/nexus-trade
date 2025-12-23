import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useMarketStore, ACTIVE_SYMBOLS } from '@/store/marketStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel, User } from '@supabase/supabase-js';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react'; 

interface RoomMember {
    user_id: string;
    user_name: string;
    avatar_url: string;
}
interface DraftingState {
    draftingOrder: string[];
    currentTurnIndex: number;
    picks: Record<string, string[]>;
    availableSymbols: string[];
    symbolsPerPlayer: number;
}

const SYMBOLS_PER_PLAYER = 2;

const generateInitialDraftState = (players: RoomMember[], symbols: string[]): DraftingState => {
    const draftingOrder = players.map(p => p.user_id); 
    const initialPicks = players.reduce((acc, player) => {
        acc[player.user_id] = [];
        return acc;
    }, {} as Record<string, string[]>);
    return {
        draftingOrder,
        currentTurnIndex: 0,
        picks: initialPicks,
        availableSymbols: [...symbols],
        symbolsPerPlayer: SYMBOLS_PER_PLAYER,
    };
};

const getPlayerIndexForPick = (pickNumber: number, playersCount: number): number => {
    const playerIndex = pickNumber % playersCount; 
    return playerIndex;
};

const CoopDraftingPage: React.FC = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    
    const lobbyRoomId = useMarketStore(s => s.lobbyRoomId);
    const setDraftedSymbols = useMarketStore(s => s.setDraftedSymbols);

    // Local State
    const [isLoading, setIsLoading] = useState(true);
    const [players, setPlayers] = useState<RoomMember[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [roomCreatorId, setRoomCreatorId] = useState<string | null>(null);
    const [draftingState, setDraftingState] = useState<DraftingState | null>(null);
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null); 

    const isHost = currentUserId && roomCreatorId && currentUserId === roomCreatorId;
    const currentTurnPlayerIndex = draftingState?.currentTurnIndex; 
    const currentTurnUserId = draftingState?.draftingOrder[currentTurnPlayerIndex as number];
    const isMyTurn = currentTurnUserId === currentUserId;
    
    const totalPicksMade = draftingState?.draftingOrder.reduce((count, userId) => count + (draftingState.picks[userId]?.length || 0), 0) || 0;
    const totalPicksRequired = (draftingState?.draftingOrder.length || 0) * SYMBOLS_PER_PLAYER;
    const draftProgress = totalPicksRequired > 0 ? (totalPicksMade / totalPicksRequired) * 100 : 0;
    const draftCompleted = totalPicksMade >= totalPicksRequired && totalPicksRequired > 0;

    useEffect(() => {
        const isCancelled = { value: false };

        if (!lobbyRoomId) {
            navigate('/coop-hub', { replace: true });
            return;
        }

       const init = async (userId: string) => {
    setCurrentUserId(userId);
    
    const { data: room, error } = await supabase
        .from('rooms')
        .select('*, room_members(user_id, user_name, avatar_url)')
        .eq('id', lobbyRoomId)
        .single();

    if (error || !room || isCancelled.value) {
        toast({ title: 'Room Error', description: 'Could not load room data. Returning to hub.', variant: 'destructive' });
        navigate('/coop-hub', { replace: true }); 
        return;
    }

    if (room.status === 'in-game') {
        if (room.drafting_state) {
            setDraftedSymbols(room.drafting_state.picks as Record<string, string[]>);
        }
        navigate('/coop', { replace: true }); 
        return;
    }
    // ---------------------------------------------------------

    setRoomCreatorId(room.created_by);
    setPlayers(room.room_members);

    if (room.status === 'lobby') {
         navigate('/coop-hub', { replace: true });
         return;
    }

            let currentState: DraftingState | null = room.drafting_state as DraftingState | null;

            if (!currentState && room.created_by === userId) {
                const newState = generateInitialDraftState(room.room_members, ACTIVE_SYMBOLS);
                
                const { error: updateError } = await supabase
                    .from('rooms')
                    .update({ drafting_state: newState })
                    .eq('id', lobbyRoomId);
                
                if (!updateError) {
                    currentState = newState;
                } else {
                    console.error('Failed to save initial draft state:', updateError);
                    toast({ title: 'Host Error', description: 'Failed to initialize draft state.', variant: 'destructive' });
                }
            }
            
            if (currentState) {
                setDraftingState(currentState);
            }
            
            if (!channel) {
                const newChannel = supabase.channel(`draft_room_state:${lobbyRoomId}`);
    
    newChannel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${lobbyRoomId}` },
        (payload: { new: { drafting_state: DraftingState | null, status: string } }) => {
            
            if (payload.new.status === 'in-game' && payload.new.drafting_state) {
                setDraftedSymbols(payload.new.drafting_state.picks);
                return; 
            }
            
            if (payload.new.drafting_state) {
                setDraftingState(payload.new.drafting_state);
            }
        }
    ).subscribe();
    
    setChannel(newChannel);
            }

            setIsLoading(false);
        };

        const fetchUserAndInit = async () => {
            setIsLoading(true);
            
            const { data: { user } } = await supabase.auth.getUser();

            if (isCancelled.value) return;

            if (!user) {
                toast({ title: 'No User', description: 'Session expired or invalid. Returning to hub.' });
                navigate('/coop-hub', { replace: true });
                return;
            }

            setCurrentUser(user);
            init(user.id);
        };
        
        fetchUserAndInit();

        return () => {
            isCancelled.value = true;
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [lobbyRoomId, navigate, toast, channel]);


    const startGame = useCallback(async (finalPicks: Record<string, string[]>) => {
        if (!lobbyRoomId || !isHost) return;
        setDraftedSymbols(finalPicks);

        const { error: gameStartError } = await supabase
            .from('rooms')
            .update({ status: 'in-game' })
            .eq('id', lobbyRoomId);

        if (gameStartError) {
            toast({ title: 'Game Start Failed', description: 'Could not communicate with the server to start the game. Try Force Start.', variant: 'destructive' });
        }
    }, [lobbyRoomId, isHost, setDraftedSymbols, toast]);


    useEffect(() => {
        if (draftCompleted && isHost && draftingState) {
            startGame(draftingState.picks);
        }
    }, [draftCompleted, isHost, draftingState, startGame]);


    const handlePickSymbol = useCallback(async (symbol: string) => {
        if (!draftingState || !currentUserId || !channel || draftCompleted) return;
        if (!isMyTurn) { 
            toast({ title: 'Not Your Turn', description: 'Please wait for your turn.' });
            return;
        }

        const currentPicks = draftingState.picks[currentUserId] || [];
        if (currentPicks.length >= SYMBOLS_PER_PLAYER) { 
            toast({ title: 'Max Picks Reached', description: `You have already picked ${SYMBOLS_PER_PLAYER} symbols.` });
            return;
        }

        const totalPicksMadeBefore = Object.values(draftingState.picks).flat().length; 
        const nextSequentialPick = totalPicksMadeBefore + 1; 
        const totalPicksRequired = draftingState.draftingOrder.length * SYMBOLS_PER_PLAYER;
        
        const draftIsNowCompleteLocal = nextSequentialPick >= totalPicksRequired; 
        
        const newAvailable = draftingState.availableSymbols.filter(s => s !== symbol);
        const newPicks = { ...draftingState.picks, [currentUserId]: [...currentPicks, symbol] };
        
        let newTurnPlayerIndex: number;
        if (draftIsNowCompleteLocal) {
            newTurnPlayerIndex = draftingState.currentTurnIndex;
        } else {
            newTurnPlayerIndex = getPlayerIndexForPick(nextSequentialPick, draftingState.draftingOrder.length);
        }

        const newDraftingState: DraftingState = {
            ...draftingState,
            currentTurnIndex: newTurnPlayerIndex,
            picks: newPicks,
            availableSymbols: newAvailable,
        };
        
        const { error: updateError } = await supabase
            .from('rooms')
            .update({ drafting_state: newDraftingState })
            .eq('id', lobbyRoomId);

        if (updateError) {
            toast({ title: 'Update Error', description: 'Failed to save your pick.', variant: 'destructive' });
        }
        
    }, [draftingState, currentUserId, lobbyRoomId, isMyTurn, isHost, channel, toast, setDraftedSymbols, draftCompleted]);
    
    
    const PRIMARY_CLASS = 'bg-primary text-primary-foreground hover:bg-primary/80 shadow-primary/50';
    const SECONDARY_CLASS = 'bg-secondary text-secondary-foreground hover:bg-secondary/80';

    const getSymbolClass = (symbol: string, index?: number) => {
        if (index !== undefined) {
            if (index % 2 === 0) {
                return PRIMARY_CLASS.replace('bg-primary/10 shadow-primary/50', ''); 
            } 
            else {
                return SECONDARY_CLASS.replace('shadow-primary/50', '');
            }
        }

        return SECONDARY_CLASS; 
    };

    if (isLoading || !draftingState) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-primary">
                <Loader2 className="w-8 h-8 mr-2 animate-spin text-primary" />
                <p className="text-xl mt-4">Preparing Draft...</p>
                <Progress value={20} className="w-1/3 h-3 mt-4" />
            </div>
        );
    }
    
    if (draftCompleted) {
         return (
             <div className="flex flex-col items-center justify-center h-screen bg-background text-primary">
                 <Check className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
                 <p className="text-3xl font-bold mb-4 text-primary">DRAFT COMPLETE</p>
                 <p className="text-xl text-muted-foreground">Starting Game Simulation...</p>
                 <Progress value={100} className="w-1/3 h-3 mt-4 [&>div]:bg-emerald-500" />
                 {isHost && (
                     <Button
                         className="mt-8 bg-yellow-600 hover:bg-yellow-700 text-lg py-3"
                         onClick={() => startGame(draftingState.picks)}
                     >
                         Force Start Game (Host Only)
                     </Button>
                 )}
             </div>
         );
    }

    return (
        <div className="flex flex-col h-screen bg-background text-primary items-center p-8">
            
            <div className="w-full max-w-6xl flex flex-col h-full">

                <header className="mb-8 pb-4 border-b border-border">
                    <h1 className="text-4xl font-extrabold tracking-tight">
                        Co-op Market Draft
                    </h1>
                    <div className="flex justify-between items-center mt-2">
                         <p className="text-lg text-muted-foreground">
                            {totalPicksMade} / {totalPicksRequired} Picks Completed
                        </p>
                        <div className="w-64">
                            <Progress 
                               value={draftProgress} 
                               className="h-3 bg-secondary" 
                               style={{ '--progress-color': draftProgress > 75 ? '#10b981' : draftProgress > 40 ? '#f59e0b' : '#ef4444' } as React.CSSProperties}
                               />
                        </div>
                    </div>
                </header>

                <Card className={`p-4 mb-8 ${isMyTurn ? 'border-yellow-500 bg-yellow-500/10' : 'border-border bg-card/50'}`}>
                    <div className="flex items-center space-x-3">
                        <svg className={`w-6 h-6 ${isMyTurn ? 'text-yellow-500 animate-pulse' : 'text-muted-foreground'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm1 3a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1z" clipRule="evenodd"></path></svg>
                        <p className="text-2xl font-bold">
                            {isMyTurn 
                             ? <span className="text-yellow-500">YOUR TURN TO PICK!</span>
                             : <span className="text-primary">Awaiting Pick from: <span className="text-primary font-extrabold">{players.find(p => p.user_id === currentTurnUserId)?.user_name || 'Player'}</span></span>
                            }
                        </p>
                    </div>
                </Card>
                <div className="flex flex-1 overflow-hidden space-x-6 pb-8">
                    <Card className="w-1/3 flex flex-col p-5 overflow-y-auto shadow-xl">
                        <h2 className="text-xl font-semibold mb-4 text-primary border-b border-border pb-3">
                            Available Market Assets ({draftingState.availableSymbols.length})
                        </h2>
                       <div className="space-y-3 overflow-y-auto pr-2">
                            {draftingState.availableSymbols.map((symbol, i) => (
                                <Button 
                                    key={symbol}
                                    className={`w-full justify-between font-mono text-lg py-6 shadow-lg hover:shadow-2xl transition-all duration-200 ${getSymbolClass(symbol, i)}`}
                                    variant={isMyTurn ? 'default' : 'secondary'}
                                    disabled={!isMyTurn} 
                                    onClick={() => handlePickSymbol(symbol)}
                                >
                                    <span className="tracking-widest">{symbol}</span>
                                    <span className="text-sm font-normal opacity-90">SELECT</span>
                                </Button>
                            ))}
                            {draftingState.availableSymbols.length === 0 && (
                                 <p className="text-center text-muted-foreground py-10 italic">All symbols have been drafted.</p>
                            )}
                       </div>
                    </Card>

                    <Card className="w-2/3 flex flex-col p-5 overflow-y-auto shadow-xl">
                        <h2 className="text-xl font-semibold mb-4 text-primary border-b border-border pb-3">
                            Draft Roster
                        </h2>
                        <div className="space-y-4 overflow-y-auto pr-2">
                            {draftingState.draftingOrder.map((userId, index) => {
                                const player = players.find(p => p.user_id === userId);
                                const picks = draftingState.picks[userId] || [];
                                const isCurrent = userId === currentTurnUserId;
                                const isCompleted = picks.length === SYMBOLS_PER_PLAYER;
                                const isMe = userId === currentUserId;

                                let borderColor = 'border-border';
                                let bgColor = 'bg-card';

                                if (isCurrent) {
                                    borderColor = 'border-yellow-500 ring-2 ring-yellow-500';
                                    bgColor = 'bg-yellow-500/10';
                                } else if (isCompleted) {
                                    borderColor = 'border-emerald-500';
                                    bgColor = 'bg-emerald-500/10';
                                } else if (isMe) {
                                    borderColor = 'border-primary';
                                    bgColor = 'bg-primary/5'; 
                                }

                                return (
                                    <div 
                                        key={userId}
                                        className={`p-4 rounded-lg border-2 transition-all duration-300 ${borderColor} ${bgColor}`}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-yellow-500 animate-ping' : isCompleted ? 'bg-emerald-600' : 'bg-muted-foreground'}`}></div>
                                                <p className="text-xl font-bold">
                                                    {player?.user_name || 'Unknown Player'}
                                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                                        {isMe && "(You)"}
                                                        {userId === roomCreatorId && " (Host)"}
                                                    </span >
                                                </p>
                                            </div>
                                            <Badge variant={isCompleted ? 'default' : 'secondary'} className={isCompleted ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                                                Picks: {picks.length}/{SYMBOLS_PER_PLAYER}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {picks.map(pick => (
                                                <Badge 
                                                    key={pick}
                                                    className={`px-4 py-1 rounded-full text-sm font-semibold tracking-wide shadow-md ${getSymbolClass(pick)}`}
                                                    variant="default" 
                                                >
                                                    {pick}
                                                </Badge>
                                            ))}
                                            {Array(SYMBOLS_PER_PLAYER - picks.length).fill(0).map((_, i) => (
                                                 <span 
                                                     key={`placeholder-${index}-${i}`}
                                                     className="px-4 py-1 bg-secondary border border-border rounded-full text-sm font-medium text-muted-foreground italic"
                                                 >
                                                     Awaiting Pick...
                                                 </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CoopDraftingPage;