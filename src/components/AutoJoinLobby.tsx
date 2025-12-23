import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useMarketStore } from '@/store/marketStore'

export function useLobbyAutoJoin() {
  const setLobbyRoomId = useMarketStore(s => s.setLobbyRoomId)

  useEffect(() => {
    let isMounted = true
    let channel: any = null

    const checkAndJoinRoom = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !isMounted) {
        if (isMounted) setLobbyRoomId(null)
        return
      }

      const { data, error } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!isMounted) return

      if (data?.room_id) {
        console.log('Auto-joining existing room:', data.room_id)
        setLobbyRoomId(data.room_id)
      } else {
        setLobbyRoomId(null)
      }
    }

    checkAndJoinRoom()

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        checkAndJoinRoom()
      } else {
        setLobbyRoomId(null)
      }
    })

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('my-room-membership')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_members',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'DELETE') {
              setLobbyRoomId(null)
            } else {
              checkAndJoinRoom()
            }
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [setLobbyRoomId])
}