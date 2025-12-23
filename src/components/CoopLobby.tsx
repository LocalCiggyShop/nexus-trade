// components/CoopLobby.tsx

import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Check, Crown, Trash2, Copy, Loader2, LogOut } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'

interface Player {
  user_id: string
  user_name: string
  avatar_url?: string
  is_ready: boolean
}

interface Room {
  id: string
  name: string
  created_by: string
  code: string
}

export default function CoopLobby({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [room, setRoom] = useState<Room | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const navigate = useNavigate();
  
  const [isLeaving, setIsLeaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const channelRef = useRef<any>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (!roomId || !currentUserId) return

    const channel = supabase.channel(`lobby:${roomId}`, {
      config: { broadcast: { self: true } },
    })

    channelRef.current = channel

    const handleBeforeUnload = () => {
      supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', currentUserId)
    }

    const setup = async () => {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (!roomData) {
        setTimeout(() => {
          toast({ title: 'Room not found', variant: 'destructive' })
          onClose() 
        }, 0) 
        return
      }

      const { data: members } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', roomId)

      setRoom(roomData)
      setPlayers(members || [])

      channel
        .on('broadcast', { event: 'player_joined' }, ({ payload }: any) => {
          toast({ title: `${payload.user_name} joined!`, duration: 3000 })
        })
        .on('broadcast', { event: 'game_start' }, () => {
          navigate('/coop-draft') 
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' }, 
          (payload: any) => {
            if (payload.table === 'room_members' && payload.eventType !== 'DELETE') {
              const player = payload.eventType === 'INSERT' ? payload.new : payload.new
              setPlayers(prev => {
                if (prev.some(p => p.user_id === player.user_id)) {
                  return prev.map(p => p.user_id === player.user_id ? { ...p, ...player } : p)
                }
                return [...prev, player]
              })
            }

            if (payload.table === 'room_members' && payload.eventType === 'DELETE') {
              const leftUserId = payload.old.user_id
              setPlayers(prev => {
                const player = prev.find(p => p.user_id === leftUserId)
                if (player) toast({ title: `${player.user_name} left`, variant: "destructive", duration: 2000 })
                return prev.filter(p => p.user_id !== leftUserId)
              })
            }

            // Handle rooms status change
            if (payload.table === 'rooms' && payload.eventType === 'UPDATE' && payload.new.id === roomId) {
              if (payload.new.status === 'drafting') {
                navigate('/coop-draft')
              }
            }
          }
        )
        .subscribe()
    }

    setup()

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [roomId, currentUserId, onClose, toast])

  const myPlayer = players.find(p => p.user_id === currentUserId)
  const isHost = room?.created_by === currentUserId
  const minPlayers = 2

  const nonHostPlayers = players.filter(p => p.user_id !== room?.created_by)
  const allNonHostsReady = nonHostPlayers.every(p => p.is_ready)
  const hasMinPlayers = players.length >= minPlayers

  const canStart = isHost && hasMinPlayers && allNonHostsReady

  const toggleReady = async () => {
    if (!myPlayer) return

    setPlayers(prev => prev.map(p => 
      p.user_id === currentUserId ? { ...p, is_ready: !p.is_ready } : p
    ))

    try {
      const { error } = await supabase
        .from('room_members')
        .update({ is_ready: !myPlayer.is_ready })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId)
        .select()

      if (error) {
        console.error("Supabase Update Failed:", error.message)
        toast({ title: "Failed to sync status", variant: "destructive" })
        setPlayers(prev => prev.map(p => 
          p.user_id === currentUserId ? { ...p, is_ready: myPlayer.is_ready } : p
        ))
      }
    } catch (err) {
      console.error("Unexpected error:", err)
    }
  }

  const leaveRoom = async () => {
    setIsLeaving(true)
    try {
      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', currentUserId)
      
      if (!error) {
        onClose() 
        toast({ title: "You left the room." })
      } else {
        console.error("Failed to delete room member:", error)
        toast({ title: "Could not leave room cleanly.", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "An unexpected error occurred while leaving.", variant: "destructive" })
    } finally {
      setIsLeaving(false)
    }
  }

  const deleteRoom = async () => {
    if (!isHost) return
    setIsDeleting(true)
    try {
        await supabase.from('rooms').delete().eq('id', roomId)
        toast({ title: "Room successfully deleted." })
        onClose()
    } catch (error) {
        toast({ title: "Failed to delete room.", variant: "destructive" })
        console.error("Error deleting room:", error)
    } finally {
        setIsDeleting(false)
    }
  }

  const startGame = async () => {
    if (!isHost || !canStart) return
    
    const { error } = await supabase
        .from('rooms')
        .update({ status: 'drafting' })
        .eq('id', roomId)

    if (error) {
        toast({ title: 'Failed to start game', description: error.message, variant: 'destructive' })
        return
    }
    
    channelRef.current?.send({
        type: 'broadcast',
        event: 'game_start',
        payload: {},
      })

  }

  const copyToClipboard = useCallback(() => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code.toUpperCase())
      toast({
        title: "Copied!",
        description: "Room code copied to clipboard.",
        duration: 2000,
      })
    }
  }, [room?.code, toast])


  if (!room) return <div className="p-8 flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin mr-2" /> Loading Room...</div>

const sorted = [...players].sort((a, b) => {
  if (a.user_id === room.created_by) return -1
  if (b.user_id === room.created_by) return 1
  return a.user_name.localeCompare(b.user_name)
})

return (
  <div className="flex flex-col h-full">
    <div className="p-6 border-b border-border flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <h2 className="text-3xl font-extrabold tracking-tight">{room.name}</h2>
        {isHost && <Badge variant="default" className="bg-yellow-600/50 hover:bg-yellow-600/60">Host</Badge>}
      </div>
      
      <div className="flex items-center bg-secondary p-2 rounded-lg border border-border">
        <p className="text-md font-medium text-secondary-foreground mr-2">
          CODE: 
          <code className="ml-1 text-xl font-mono tracking-widest text-primary font-bold">
            {room.code.toUpperCase()}
          </code>
        </p>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={copyToClipboard} 
          className="h-8 w-8 text-primary hover:bg-primary/10"
          title="Copy room code"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>

    <div className="flex-grow p-6 overflow-y-auto">
      <h3 className="text-xl font-semibold mb-4 text-muted-foreground">Players in Lobby ({players.length})</h3>
      
      {/* PLAYER GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sorted.map(p => (
          <Card key={p.user_id} className="text-center transition-all duration-200 hover:shadow-lg hover:border-primary/50">
            <CardContent className="p-4 pt-6 flex flex-col items-center">
              <div className="relative mb-3">
                <Avatar className="w-16 h-16 mx-auto border-4 border-primary/50">
                  <AvatarImage src={p.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">{p.user_name[0]}</AvatarFallback>
                </Avatar>
                {p.user_id === room.created_by && (
                  <Crown className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 fill-yellow-500" />
                )}
              </div>
              <p className="font-semibold text-lg truncate w-full">{p.user_name}</p>
              <Badge 
                className={`mt-2 ${p.is_ready ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              >
                {p.is_ready ? <><Check className="w-3 h-3 mr-1" /> Ready</> : 'Waiting'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>

    <div className="p-6 border-t border-border flex justify-between items-center bg-card/50 sticky bottom-0">
      
      {isHost ? (
        <Button 
          variant="destructive" 
          size="lg" 
          onClick={deleteRoom}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Deleting...</>
          ) : (
            <><Trash2 className="w-5 h-5 mr-2" /> Delete Room</>
          )}
        </Button>
      ) : (
        <div className="w-[150px]"></div> 
      )}

      <div className="flex gap-4">
        {isHost ? (
          <Button 
            size="lg" 
            onClick={startGame}
            disabled={!canStart}
            className="h-12 text-lg px-8"
          >
            {canStart ? 'Start Game' : `Waiting (${minPlayers} players, all ready)`}
          </Button>
        ) : (
          <Button 
            size="lg" 
            variant={myPlayer?.is_ready ? 'secondary' : 'default'} 
            onClick={toggleReady}
            className="h-12 text-lg px-8"
          >
            {myPlayer?.is_ready ? <><Check className="ml-2 w-5 h-5" /> Ready!</> : 'Mark as Ready'}
          </Button>
        )}
      </div>

      {/* RIGHT: Leave Button */}
      <Button 
        variant="ghost" 
        size="lg" 
        onClick={leaveRoom}
        disabled={isLeaving}
        className="text-lg px-6"
      >
        {isLeaving ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Leaving...</>
        ) : (
            <><LogOut className="w-5 h-5 mr-2" /> Leave</>
        )}
      </Button>

    </div>
  </div>
)
}