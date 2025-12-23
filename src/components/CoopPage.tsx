import { useEffect, useState, useCallback } from 'react' 
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from "@/hooks/use-toast"
import { supabase } from '@/lib/supabase'
import CoopLobby from './CoopLobby'
import { useMarketStore } from '@/store/marketStore'
import { Loader2, PersonStandingIcon, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CoopAuthWall from './CoopAuthWall'; 

export default function CoopPage() {
  const navigate = useNavigate();
  const { toast } = useToast()
    
  const [inputCode, setInputCode] = useState('')
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null) 
  const [loading, setLoading] = useState(false)
  
  const globalLobbyRoomId = useMarketStore(s => s.lobbyRoomId)
  const setLobbyRoomId = useMarketStore(s => s.setLobbyRoomId)
  
  const setIsHost = useMarketStore(s => s.setIsHost)

  useEffect(() => {
    if (globalLobbyRoomId) {
      setCurrentRoomId(globalLobbyRoomId)
    }
  }, [globalLobbyRoomId])

  const handlePageExit = () => {
    setCurrentRoomId(null)
    setLobbyRoomId(null) 
    navigate('/', { replace: true })
  }

  const createRoom = useCallback(async (userId: string) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication state inconsistency.')
      
      const userName = user.user_metadata.full_name || user.email?.split('@')[0] || 'Player'

      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: `${userName}'s Room`,
          created_by: userId,
          status: 'lobby',
        })
        .select('id, code')
        .single()

      if (roomError) throw roomError

      const { data: member, error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: userId,
          user_name: userName,
          avatar_url: user.user_metadata.avatar_url,
          is_ready: false,
        })
        .select()
        .single()

      if (memberError) throw memberError

      await supabase
        .channel(`lobby:${room.id}`)
        .send({
          type: 'broadcast',
          event: 'player_joined',
          payload: { user_name: member.user_name, avatar_url: member.avatar_url },
        })

      setCurrentRoomId(room.id)
      setLobbyRoomId(room.id)

      setIsHost(true)

      toast({
        title: 'Room Created!',
        description: `Share code: ${room.code.toUpperCase()}`,
        duration: 6000,
      })
    } catch (error: any) {
      toast({
        title: 'Failed to create room',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [setLobbyRoomId, toast, setIsHost]);

  const joinRoom = useCallback(async (userId: string) => {
    const code = inputCode.trim().toLowerCase()
    if (!code) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication state inconsistency.')
      
      const { data: room } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('code', code)
        .single()

      if (!room) throw new Error('Invalid room code')

      const userName = user.user_metadata.full_name || user.email?.split('@')[0] || 'Player'

      const { data: member, error } = await supabase
        .from('room_members')
        .upsert(
          {
            room_id: room.id,
            user_id: userId,
            user_name: userName,
            avatar_url: user.user_metadata.avatar_url,
            is_ready: false,
          },
          { onConflict: 'room_id,user_id' }
        )
        .select()
        .single()

      if (error) throw error

      await supabase
        .channel(`lobby:${room.id}`)
        .send({
          type: 'broadcast',
          event: 'player_joined',
          payload: { user_name: member.user_name, avatar_url: member.avatar_url },
        })

      setCurrentRoomId(room.id)
      setLobbyRoomId(room.id)
      setInputCode('')

      setIsHost(false)

      toast({
        title: 'Joined!',
        description: `Welcome to ${room.name}`,
      })
    } catch (error: any) {
      toast({
        title: 'Failed to join',
        description: error.message || 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [inputCode, setLobbyRoomId, toast, setIsHost]);

  const renderCoopContent = (userId: string) => ( 
    <div className="bg-card w-full max-w-4xl min-h-[500px] rounded-2xl border p-2 border-border shadow-2xl transition-all duration-300">
      {currentRoomId ? (
        <CoopLobby 
          roomId={currentRoomId} 
          onClose={handlePageExit} 
        />
      ) : (
        <div className="p-10">
          <h2 className="text-4xl font-extrabold text-center mb-10 tracking-tight flex items-center justify-center">
            <PersonStandingIcon className="w-8 h-8 mr-3 text-primary" /> Co-op Trading
          </h2>

          <div className="space-y-6 max-w-md mx-auto">
            <Button 
                onClick={() => createRoom(userId)} 
                disabled={loading} 
                size="lg" 
                className="w-full h-16 text-xl font-semibold"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Room...</>
              ) : (
                'Create New Room'
              )}
            </Button>

            <div className="relative pt-4">
              <div className="flex items-center text-muted-foreground justify-center mb-4">
                  <hr className="w-1/4 border-border/50" />
                  <span className="mx-4 text-sm font-medium">OR JOIN EXISTING</span>
                  <hr className="w-1/4 border-border/50" />
              </div>
              <Input
                placeholder="Enter 6-digit room code..."
                value={inputCode}
                maxLength={6} 
                onChange={e => setInputCode(e.target.value.toUpperCase())} 
                onKeyDown={e => e.key === 'Enter' && joinRoom(userId)}
                className="h-14 text-xl tracking-widest text-center"
              />
              <Button 
                onClick={() => joinRoom(userId)} 
                disabled={loading || inputCode.length !== 6} 
                className="w-full h-14 mt-4 text-lg"
              >
                Join Room
              </Button>
            </div>

            <Button variant="ghost" size="lg" onClick={handlePageExit} className="w-full mt-6">
              Go Back to Selection
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <CoopAuthWall 
      onAuthenticated={renderCoopContent} 
    />
  );
}

// import { useEffect, useState } from 'react'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { useToast } from "@/hooks/use-toast"
// import { supabase } from '@/lib/supabase'
// import CoopLobby from './CoopLobby'
// import { useMarketStore } from '@/store/marketStore'
// import { Loader2, Zap } from 'lucide-react'

// export default function CoopModal({ open, onClose }: { open: boolean; onClose: () => void }) {
//   const [inputCode, setInputCode] = useState('')
//   const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
//   const [loading, setLoading] = useState(false)
//   const globalLobbyRoomId = useMarketStore(s => s.lobbyRoomId)
//   const setLobbyRoomId = useMarketStore(s => s.setLobbyRoomId)
//   const { toast } = useToast()

//   useEffect(() => {
//     if (open && globalLobbyRoomId) {
//       setCurrentRoomId(globalLobbyRoomId)
//     }
//   }, [open, globalLobbyRoomId])

//   const handleLobbyClose = () => {
//     setCurrentRoomId(null)
//     setLobbyRoomId(null)
//   }

//   const createRoom = async () => {
//     setLoading(true)
//     try {
//       const { data: { user } } = await supabase.auth.getUser()
//       if (!user) throw new Error('Please login first')

//       const userName = user.user_metadata.full_name || user.email?.split('@')[0] || 'Player'

//       const { data: room, error: roomError } = await supabase
//         .from('rooms')
//         .insert({
//           name: `${userName}'s Room`,
//           created_by: user.id,
//         })
//         .select('id, code')
//         .single()

//       if (roomError) throw roomError

//       const { data: member, error: memberError } = await supabase
//         .from('room_members')
//         .insert({
//           room_id: room.id,
//           user_id: user.id,
//           user_name: userName,
//           avatar_url: user.user_metadata.avatar_url,
//           is_ready: false,
//         })
//         .select()
//         .single()

//       if (memberError) throw memberError

//       // Broadcast AFTER confirmed insert
//       await supabase
//         .channel(`lobby:${room.id}`)
//         .send({
//           type: 'broadcast',
//           event: 'player_joined',
//           payload: { user_name: member.user_name, avatar_url: member.avatar_url },
//         })

//       setCurrentRoomId(room.id)
//       setLobbyRoomId(room.id)

//       toast({
//         title: 'Room Created!',
//         description: `Share code: ${room.code.toUpperCase()}`,
//         duration: 8000,
//       })
//     } catch (error: any) {
//       toast({
//         title: 'Failed to create room',
//         description: error.message,
//         variant: 'destructive',
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   const joinRoom = async () => {
//     const code = inputCode.trim().toLowerCase()
//     if (!code) return

//     setLoading(true)
//     try {
//       const { data: { user } } = await supabase.auth.getUser()
//       if (!user) throw new Error('Please login first')

//       const { data: room } = await supabase
//         .from('rooms')
//         .select('id, name')
//         .eq('code', code)
//         .single()

//       if (!room) throw new Error('Invalid room code')

//       const userName = user.user_metadata.full_name || user.email?.split('@')[0] || 'Player'

//       const { data: member, error } = await supabase
//         .from('room_members')
//         .upsert(
//           {
//             room_id: room.id,
//             user_id: user.id,
//             user_name: userName,
//             avatar_url: user.user_metadata.avatar_url,
//             is_ready: false,
//           },
//           { onConflict: 'room_id,user_id' }
//         )
//         .select()
//         .single()

//       if (error) throw error

//       // Critical: wait for broadcast to go through
//       await supabase
//         .channel(`lobby:${room.id}`)
//         .send({
//           type: 'broadcast',
//           event: 'player_joined',
//           payload: { user_name: member.user_name, avatar_url: member.avatar_url },
//         })

//       setCurrentRoomId(room.id)
//       setLobbyRoomId(room.id)
//       setInputCode('')

//       toast({
//         title: 'Joined!',
//         description: `Welcome to ${room.name}`,
//       })
//     } catch (error: any) {
//       toast({
//         title: 'Failed to join',
//         description: error.message || 'Unknown error',
//         variant: 'destructive',
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   if (!open) return null

//   return (
//     <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm" onClick={currentRoomId ? undefined : onClose}>
//       <div 
//         className="bg-card w-full max-w-2xl m-4 rounded-2xl border p-2 border-border shadow-2xl transition-all duration-300" 
//         onClick={e => e.stopPropagation()}
//       >
//         {currentRoomId ? (
//           <CoopLobby roomId={currentRoomId} onClose={handleLobbyClose} />
//         ) : (
//           <div className="p-10">
//             <h2 className="text-4xl font-extrabold text-center mb-10 tracking-tight flex items-center justify-center">
//               <Zap className="w-8 h-8 mr-3 text-primary" /> Co-op Trading Hub
//             </h2>

//             <div className="space-y-6">
//               <Button onClick={createRoom} disabled={loading} size="lg" className="w-full h-16 text-xl font-semibold">
//                 {loading ? (
//                   <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Room...</>
//                 ) : (
//                   '⚡ Create New Room'
//                 )}
//               </Button>

//               <div className="relative pt-4">
//                 <div className="flex items-center text-muted-foreground justify-center mb-4">
//                     <hr className="w-1/4 border-border/50" />
//                     <span className="mx-4 text-sm font-medium">OR JOIN EXISTING</span>
//                     <hr className="w-1/4 border-border/50" />
//                 </div>
//                 <Input
//                   placeholder="Enter 6-digit room code..."
//                   value={inputCode}
//                   maxLength={6} // Added max length for better UX
//                   onChange={e => setInputCode(e.target.value.toUpperCase())} // Auto-convert to uppercase
//                   onKeyDown={e => e.key === 'Enter' && joinRoom()}
//                   className="h-14 text-xl tracking-widest text-center"
//                 />
//                 <Button 
//                   onClick={joinRoom} 
//                   disabled={loading || inputCode.length !== 6} 
//                   className="w-full h-14 mt-4 text-lg"
//                 >
//                   Join Room
//                 </Button>
//               </div>

//               <Button variant="ghost" size="lg" onClick={onClose} className="w-full mt-6">
//                 Go Back
//               </Button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }