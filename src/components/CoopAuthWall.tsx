import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, X, Zap, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface CoopAuthWallProps {
  onAuthenticated: (userId: string) => React.ReactNode;
}

export default function CoopAuthWall({ onAuthenticated }: CoopAuthWallProps) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/coop-hub',
        },
      });

      if (error) throw error;

    } catch (error: any) {
      toast({
        title: 'Sign-In Failed',
        description: error.message,
        variant: 'destructive',
      });
      setAuthLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (session) {
    return (
        <div className="min-h-screen w-full bg-background text-foreground font-sans flex items-center justify-center p-4">
            {onAuthenticated(session.user.id)}
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg min-h-[400px] rounded-2xl border p-10 border-border shadow-2xl text-center">
        
        <Zap className="w-10 h-10 mx-auto mb-6 text-primary" />
        <h2 className="text-3xl font-extrabold mb-3 tracking-tight">
          Co-op Access Required
        </h2>
        <p className="text-muted-foreground mb-10">
          Please sign in to create or join a multiplayer trading room.
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" className="w-full h-12 text-lg" disabled={authLoading}>
              {authLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing In...</>
              ) : (
                <><LogIn className="mr-2 h-5 w-5" /> Sign In Options</>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
            <DropdownMenuItem 
                onClick={handleGoogleSignIn} 
                className="cursor-pointer font-semibold"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google Logo" className="w-4 h-4 mr-2" />
              Sign in with Google
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" onClick={handleGoBack} className="w-full mt-6">
          <X className="w-4 h-4 mr-2" /> Go Back to Main Menu
        </Button>

      </div>
    </div>
  );
}