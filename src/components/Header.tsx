import { useMarketStore, useActiveProfile, getConfig } from '@/store/marketStore';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Home, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  isCoop: boolean;
  onCoopClick: () => void;
  onExitApp: () => Promise<void>;
}

export default function Header({ isCoop, onCoopClick, onExitApp }: HeaderProps) {
  
  const [isExiting, setIsExiting] = useState(false);

  const profile = useActiveProfile();
  
  const priceData = useMarketStore(s => s.priceData);

  const handleExitClick = async () => {
    setIsExiting(true);
    try {
        await onExitApp();
    } finally {
        setIsExiting(false);
    }
  };

  const calculateTotalPnl = () => {
    let pnl = 0;
    const { positions } = profile;
    
    for (const sym in positions) {
      const pos = positions[sym];
      const currentPrice = priceData[sym] || pos.avgPrice;
      pnl += (currentPrice - pos.avgPrice) * pos.size;
    }
    return pnl;
  };
  
  const accountBalance = profile.cash;
  const totalPnl = calculateTotalPnl();
  
  const formatCurrency = (value: number) => `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  const pnlColor = totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <header className="sticky top-0 z-10 bg-background border-b border-border shadow-md py-3 px-6">
      <div className="flex justify-between items-center max-w-[1800px] mx-auto">
           <div className="flex items-center gap-3 sm:gap-4">
           <img 
             src="/logo.png" 
             alt="NEXUS TRADE"
             className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain drop-shadow-md"
           />
           <div className="hidden sm:block">
             <h1 className="text-xl sm:text-2xl font-bold tracking-tighter leading-none">
               NEXUS <span className="text-muted-foreground font-normal">TRADE</span>
             </h1>
             <p className="text-xs text-muted-foreground -mt-0.5">Professional Trading Simulator</p>
           </div>
           <div className="sm:hidden">
             <h1 className="text-lg font-bold tracking-tight">
               NEXUS <span className="text-muted-foreground font-normal">TRADE</span>
             </h1>
           </div>
         </div>
        
        {!isCoop && (
          <div className="flex items-center space-x-6 text-sm font-mono">
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-xs">BALANCE</span>
              <span className="text-lg font-semibold">{formatCurrency(accountBalance)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-xs">TOTAL P&L</span>
              <span className={`text-lg font-semibold ${pnlColor}`}>{formatCurrency(totalPnl)}</span>
            </div>
          </div>
        )}
        
        <div className="flex space-x-3">
          
          {!isCoop && (
            <Button variant="outline" onClick={onCoopClick}>
              <Users className="w-4 h-4 mr-2" />
              Co-op
            </Button>
          )}

          <Button 
                    variant="ghost" 
                    onClick={handleExitClick} 
                    disabled={isExiting}
                    className="text-muted-foreground hover:text-primary"
                >
                    {isExiting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Disconnecting...
                        </>
                    ) : isCoop ? (
                        <>
                            <Home className="w-4 h-4 mr-2" /> Back to Main Menu
                        </>
                    ) : (
                        <>
                            <LogOut className="w-4 h-4 mr-2" /> Exit Simulation
                        </>
                    )}
                </Button>
          
        </div>
      </div>
    </header>
  );
}

// import ThemeToggle from './ThemeToggle'
// import { useActiveProfile, useProfileActions, useMarketStore, useCoopModal } from '@/store/marketStore'
// import { Separator } from '@/components/ui/separator'
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu'
// import { Button } from '@/components/ui/button'
// import { Avatar, AvatarFallback } from '@/components/ui/avatar'
// import { Plus, Trash2, Check, ChevronDown, Users, LogIn, LogOut } from 'lucide-react'
// import { useEffect, useState } from 'react'
// import { supabase } from '@/lib/supabase'
// import { AvatarImage } from '@radix-ui/react-avatar'

// export default function Header() {
//   const profile = useActiveProfile()
//   const { profiles } = useMarketStore()
//   const { createProfile, deleteProfile, switchProfile } = useProfileActions()
//   const { setOpen: openCoopModal } = useCoopModal()

//   const [isCreating, setIsCreating] = useState(false)
//   const [newName, setNewName] = useState('')

//   const { priceData } = useMarketStore()

//   const unrealized = Object.entries(profile.positions).reduce((sum, [sym, pos]) => {
//     const currentPrice = priceData[sym] ?? pos.avgPrice
//     return sum + (currentPrice - pos.avgPrice) * pos.size
//   }, 0)

//   const totalEquity = profile.cash + unrealized
//   const isPositive = unrealized >= 0

//   const handleCreate = () => {
//     if (profiles.length >= 5 || !newName.trim()) return
//     createProfile(newName.trim())
//     setNewName('')
//     setIsCreating(false)
//   }
// // Inside your Header component
// const [user, setUser] = useState<any>(null)
// const pushWarning = useMarketStore(s => s.pushWarning)

// // Get user + listen for changes
// useEffect(() => {
//   supabase.auth.getSession().then(({ data: { session } }) => {
//     setUser(session?.user ?? null)
//   })

//   const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
//     setUser(session?.user ?? null)
//   })

//   return () => listener.subscription.unsubscribe()
// }, [])

// const signInWithGoogle = async () => {
//   try {
//     await supabase.auth.signInWithOAuth({
//       provider: 'google',
//       options: { redirectTo: window.location.origin }
//     })
//   } catch (error: any) {
//     pushWarning(`Login failed: ${error.message}`, 'error')
//   }
// }

//   return (
//     <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
//       <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1800px]">

//         <div className="flex items-center gap-3 sm:gap-4">
//           <img 
//             src="/logo.png" 
//             alt="NEXUS TRADE"
//             className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain drop-shadow-md"
//           />
//           <div className="hidden sm:block">
//             <h1 className="text-xl sm:text-2xl font-bold tracking-tighter leading-none">
//               NEXUS <span className="text-muted-foreground font-normal">TRADE</span>
//             </h1>
//             <p className="text-xs text-muted-foreground -mt-0.5">Professional Trading Simulator</p>
//           </div>
//           <div className="sm:hidden">
//             <h1 className="text-lg font-bold tracking-tight">
//               NEXUS<span className="text-muted-foreground font-normal">TRADE</span>
//             </h1>
//           </div>
//         </div>

//         <div className="flex items-center gap-4 sm:gap-6">

//           <div className="hidden sm:flex items-center gap-4 text-sm">
//             <div className="text-right">
//               <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Net Equity</p>
//               <p className="font-mono font-bold text-base sm:text-lg">
//                 ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
//               </p>
//             </div>
//             <Separator orientation="vertical" className="h-8" />
//             <div className="text-right">
//               <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Unrealized</p>
//               <div className={`font-mono font-bold text-base sm:text-lg ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
//                 {isPositive ? '+' : ''}{unrealized.toFixed(0)}
//               </div>
//             </div>
//           </div>

//           <div className="flex sm:hidden items-center gap-2 text-sm">
//             <div className="text-right">
//               <p className="text-xs text-muted-foreground font-medium">${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
//               <p className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
//                 {isPositive ? '+' : ''}{unrealized.toFixed(0)}
//               </p>
//             </div>
//           </div>

//           <div className="flex items-center gap-2 sm:gap-3">
//             <DropdownMenu open={isCreating ? true : undefined}>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3 gap-2">
//                   <Avatar className="h-6 w-6">
//                     <AvatarFallback className="text-xs bg-primary/10">
//                       {profile.name[0].toUpperCase()}
//                     </AvatarFallback>
//                   </Avatar>
//                   <span className="hidden sm:inline text-sm font-medium max-w-24 truncate">
//                     {profile.name}
//                   </span>
//                   <ChevronDown className="h-3 w-3 opacity-50" />
//                 </Button>
//               </DropdownMenuTrigger>

//               <DropdownMenuContent align="end" className="w-64 p-3 space-y-2">
//                 <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
//                   Trading Profiles
//                 </DropdownMenuLabel>

//                 {profiles.map(p => (
//                   <DropdownMenuItem
//                     key={p.id}
//                     className="h-10 px-3 rounded-lg cursor-pointer hover:bg-accent/70 group"
//                     onSelect={() => switchProfile(p.id)}
//                   >
//                     <div className="flex w-full items-center justify-between">
//                       <div className="flex items-center gap-3">
//                         <Avatar className="h-7 w-7">
//                           <AvatarFallback className="text-xs">{p.name[0]}</AvatarFallback>
//                         </Avatar>
//                         <span className="text-sm truncate max-w-32">{p.name}</span>
//                       </div>
//                       {p.id === profile.id && <Check className="h-4 w-4 text-emerald-500" />}
//                       {profiles.length > 1 && (
//                         <button
//                           onClick={(e) => { e.stopPropagation(); deleteProfile(p.id) }}
//                           className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10"
//                         >
//                           <Trash2 className="h-3.5 w-3.5 text-destructive" />
//                         </button>
//                       )}
//                     </div>
//                   </DropdownMenuItem>
//                 ))}

//                 {profiles.length < 5 && (
//                   <>
//                     <DropdownMenuSeparator />
//                     {isCreating ? (
//                       <div className="flex flex-col gap-2 p-2 bg-accent/30 rounded-lg">
//                         <input
//                           type="text"
//                           placeholder="Profile name..."
//                           value={newName}
//                           onChange={e => setNewName(e.target.value)}
//                           onKeyDown={e => e.key === 'Enter' && handleCreate()}
//                           className="h-9 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
//                           autoFocus
//                           onClick={e => e.stopPropagation()}
//                         />
//                         <div className="flex gap-2">
//                           <Button size="sm" className="flex-1" onClick={handleCreate}>Add</Button>
//                           <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
//                         </div>
//                       </div>
//                     ) : (
//                       <Button
//                         variant="ghost"
//                         className="w-full h-9 justify-start text-sm"
//                         onClick={() => setIsCreating(true)}
//                       >
//                         <Plus className="mr-2 h-4 w-4" /> New Profile
//                       </Button>
//                     )}
//                   </>
//                 )}
//               </DropdownMenuContent>
//             </DropdownMenu>

//             {user ? (
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <Button variant="ghost" size="sm" className="h-9 px-2 gap-2">
//                     <Avatar className="h-7 w-7">
//                       <AvatarImage src={user.user_metadata.avatar_url} />
//                       <AvatarFallback>{user.user_metadata.full_name?.[0] || 'T'}</AvatarFallback>
//                     </Avatar>
//                     <span className="hidden sm:inline text-sm font-medium">
//                       {user.user_metadata.full_name || 'Trader'}
//                     </span>
//                     <ChevronDown className="h-3 w-3 opacity-50" />
//                   </Button>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent align="end">
//                   <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuItem 
//                     className="text-destructive"
//                     onClick={() => supabase.auth.signOut()}
//                   >
//                     <LogOut className="mr-2 h-4 w-4" />
//                     Logout
//                   </DropdownMenuItem>
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             ) : (
//               <Button
//                 variant="outline"
//                 size="sm"
//                 className="h-9 px-3 gap-2"
//                 onClick={signInWithGoogle}
//               >
//                 <LogIn className="w-4 h-4" />
//                 <span className="hidden sm:inline">Login</span>
//               </Button>
//             )}

//             <Button
//               variant="outline"
//               size="sm"
//               className="h-9 px-3 gap-2 border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
//               onClick={() => openCoopModal(true)}
//             >
//               <Users className="w-4 h-4" />
//               <span className="hidden sm:inline font-medium">Co-op</span>
//             </Button>

//             <ThemeToggle />
//           </div>
//         </div>
//       </div>
//     </header>
//   )
// }