import ThemeToggle from './ThemeToggle'
import { useActiveProfile, useProfileActions, useMarketStore } from '@/store/marketStore'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Trash2, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const profile = useActiveProfile()
  const { profiles } = useMarketStore()
  const { createProfile, deleteProfile, switchProfile } = useProfileActions()

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { priceData } = useMarketStore()

  const unrealized = Object.entries(profile.positions).reduce((sum, [sym, pos]) => {
    const currentPrice = priceData[sym] ?? pos.avgPrice
    return sum + (currentPrice - pos.avgPrice) * pos.size
  }, 0)

  const totalEquity = profile.cash + unrealized
  const isPositive = unrealized >= 0

  const handleCreate = () => {
    if (profiles.length >= 5 || !newName.trim()) return
    createProfile(newName.trim())
    setNewName('')
    setIsCreating(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1800px]">

        <div className="flex items-center gap-3 sm:gap-4">
          <img 
            src="/logo.png" 
            alt="NEXUS EDGE"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain drop-shadow-md"
          />
          <div className="hidden sm:block">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tighter leading-none">
              NEXUS <span className="text-muted-foreground font-normal">EDGE</span>
            </h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Professional Trading Simulator</p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-lg font-bold tracking-tight">
              NEXUS<span className="text-muted-foreground font-normal">EDGE</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">

          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Net Equity</p>
              <p className="font-mono font-bold text-base sm:text-lg">
                ${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Unrealized</p>
              <div className={`font-mono font-bold text-base sm:text-lg ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{unrealized.toFixed(0)}
              </div>
            </div>
          </div>

          <div className="flex sm:hidden items-center gap-2 text-sm">
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">${totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{unrealized.toFixed(0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <DropdownMenu open={isCreating ? true : undefined}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3 gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {profile.name[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-24 truncate">
                    {profile.name}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-64 p-3 space-y-2">
                <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trading Profiles
                </DropdownMenuLabel>

                {profiles.map(p => (
                  <DropdownMenuItem
                    key={p.id}
                    className="h-10 px-3 rounded-lg cursor-pointer hover:bg-accent/70 group"
                    onSelect={() => switchProfile(p.id)}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{p.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate max-w-32">{p.name}</span>
                      </div>
                      {p.id === profile.id && <Check className="h-4 w-4 text-emerald-500" />}
                      {profiles.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteProfile(p.id) }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}

                {profiles.length < 5 && (
                  <>
                    <DropdownMenuSeparator />
                    {isCreating ? (
                      <div className="flex flex-col gap-2 p-2 bg-accent/30 rounded-lg">
                        <input
                          type="text"
                          placeholder="Profile name..."
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleCreate()}
                          className="h-9 px-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={handleCreate}>Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full h-9 justify-start text-sm"
                        onClick={() => setIsCreating(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" /> New Profile
                      </Button>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}