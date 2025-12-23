import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, User, X } from 'lucide-react'; 
import ThemeToggle from './ThemeToggle';
import { APP_NAME } from "../lib/version";
// import { Switch } from '@radix-ui/react-switch';
import { Switch } from '@/components/ui/switch';
import { useCoopSettings } from '@/store/marketStore';

interface ModeSelectionScreenProps {
  onSelectMode: (mode: 'singleplayer' | 'coop') => void;
  onOpenSettings: () => void;
  isSettingsOpen: boolean; 
  onCloseSettings: () => void;
}

export default function ModeSelectionScreen({ onSelectMode, onOpenSettings, isSettingsOpen, onCloseSettings }: ModeSelectionScreenProps) {
  const { showNameInCoop, toggleShowNameInCoop } = useCoopSettings();

  const SettingsPanel = () => (
    <div className="absolute inset-0 bg-card/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl overflow-y-auto">
      <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-3">
        <h2 className="text-3xl font-bold">Game Settings</h2>
        <Button variant="ghost" size="icon" onClick={onCloseSettings}>
          <X className="w-6 h-6" />
        </Button>
      </div>
      
      <div className="space-y-6">
        <Card className="bg-background/50 border-border/70">
          <CardHeader>
            <CardTitle>Co-op Name Display</CardTitle>
            <CardDescription>Control how your information is shared.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
                <label htmlFor="show-name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Show your name in co-op mode
                </label>
                <Switch
                    id="show-name"
                    checked={showNameInCoop}
                    onCheckedChange={toggleShowNameInCoop}
                />
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-background z-[100] flex items-center justify-center p-4">
      <div className="relative max-w-4xl w-full min-h-[500px] bg-card border border-primary/20 rounded-2xl shadow-2xl p-8 md:p-12 overflow-hidden">
        
        <div className="absolute bottom-5 right-5 z-20">
            <ThemeToggle />
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-center mb-10 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
          {APP_NAME}
        </h1>
        
        {isSettingsOpen && <SettingsPanel />}
        
        <div className={`grid grid-cols-1 gap-6 transition-opacity duration-300 ${isSettingsOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <Card className="flex flex-col h-full hover:shadow-primary/50 hover:shadow-xl transition-shadow cursor-pointer border-2 border-primary/20 bg-background/50" onClick={() => onSelectMode('singleplayer')}>
              <CardHeader className="text-center flex-grow">
                <User className="w-10 h-10 text-primary mx-auto mb-2" />
                <CardTitle className="text-2xl">Singleplayer</CardTitle>
                <CardDescription>Trade solo and focus on mastering the market.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button className="w-full h-12 text-lg">Start Trading</Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col h-full hover:shadow-emerald-500/50 hover:shadow-xl transition-shadow cursor-pointer border-2 border-emerald-500/20 bg-background/50" onClick={() => onSelectMode('coop')}>
              <CardHeader className="text-center flex-grow">
                <Users className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <CardTitle className="text-2xl">Co-op Mode</CardTitle>
                <CardDescription>Join friends to manage a shared position.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="secondary" className="w-full h-12 text-lg bg-emerald-700/30 text-emerald-400 hover:bg-emerald-700/50">Join Hub</Button>
              </CardContent>
            </Card>
          </div>
          
          <Button variant="outline" size="lg" className="w-full mt-4 h-12 text-lg bg-card/70 border-border/70" onClick={onOpenSettings}>
             <Settings className="w-5 h-5 mr-2" /> Open Settings
          </Button>
          
        </div>
        
        <p className="text-center text-xs text-muted-foreground mt-10">
            Select your preferred game mode to begin.
        </p>
      </div>
    </div>
  );
}