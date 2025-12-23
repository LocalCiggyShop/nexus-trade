import { useEffect, useMemo, useCallback } from 'react';
import { useMarketStore, MarketNews, NEWS_EVENTS } from '@/store/marketStore'; 
import { supabase } from '@/lib/supabase';

const createRandomNews = (): MarketNews => {
    const NEWS_EVENTS = useMarketStore.getState().NEWS_EVENTS;
    const eventTemplate = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
    
    // Create the full news object
    const now = Date.now();
    return {
        ...eventTemplate,
        id: now.toString() + Math.random().toString(36).substring(2, 9), // Unique ID
        time: now,
    };
};

const NEWS_CHECK_INTERVAL_MS = 5000;

export default function CoopNewsController() {
    const lobbyRoomId = useMarketStore(s => s.lobbyRoomId);
    const isHost = useMarketStore(s => s.isHost);
    const addRemoteNews = useMarketStore(s => s.addRemoteNews);

    const newsChannel = useMemo(() => {
        if (!lobbyRoomId) return null;
        return supabase.channel(`market_news_room_${lobbyRoomId}`);
    }, [lobbyRoomId]);


    useEffect(() => {
        if (!newsChannel || !lobbyRoomId) return;

        console.log(`[News Controller] Subscribing to channel: market_news_room_${lobbyRoomId}`);

        newsChannel
            .on<MarketNews>(
                'broadcast', 
                { event: 'market_news_event' }, 
                (payload) => {
                    const news = payload.payload;
                    console.log(`[News Controller] Received News: ${news.headline}`);
                    addRemoteNews(news); 
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[News Controller] Successfully subscribed to news channel.`);
                }
            });

        return () => {
            newsChannel.unsubscribe();
            console.log(`[News Controller] Unsubscribed from news channel.`);
        };
    }, [newsChannel, lobbyRoomId, addRemoteNews]);

    useEffect(() => {
        if (!newsChannel || !isHost) {
            return;
        }

        let intervalId: NodeJS.Timeout | null = null;
        
        const generateAndBroadcastNews = () => {
            if (Math.random() < 0.10) { 
                const newEvent = createRandomNews();

                newsChannel.send({
                    type: 'broadcast',
                    event: 'market_news_event',
                    payload: newEvent,
                })
                .then(() => {
                    console.log(`[HOST] Broadcasted news event: ${newEvent.headline}`);
                })
                .catch((error) => {
                    console.error('[HOST] Error broadcasting news:', error);
                });
            }
        };

        intervalId = setInterval(generateAndBroadcastNews, NEWS_CHECK_INTERVAL_MS);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
                console.log('[HOST] News generation stopped.');
            }
        };

    }, [newsChannel, isHost]);

    return null;
}