import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Key, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

function generateTOTP(userId: string, timeSlot: number): string {
  // Simple deterministic token generation based on userId and time slot
  const seed = `${userId}-${timeSlot}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Generate 6 alphanumeric characters
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  let tempHash = Math.abs(hash);
  for (let i = 0; i < 6; i++) {
    token += chars[tempHash % chars.length];
    tempHash = Math.floor(tempHash / chars.length) + (i + 1) * 7919;
  }
  
  return token;
}

function getCurrentTimeSlot(): number {
  return Math.floor(Date.now() / 30000);
}

function getSecondsRemaining(): number {
  return 30 - Math.floor((Date.now() % 30000) / 1000);
}

export function TokenDialog({ open, onOpenChange, user }: TokenDialogProps) {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateUserPassword = useCallback(async (newToken: string) => {
    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No hay sesión activa");
      }

      const { error } = await supabase.functions.invoke("admin-update-user-password", {
        body: {
          user_id: user.id,
          new_password: newToken,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating token password:", error);
      // Don't show error to user, just log it - the token will still display
    } finally {
      setIsUpdating(false);
    }
  }, [user.id]);

  const generateNewToken = useCallback(() => {
    const timeSlot = getCurrentTimeSlot();
    const newToken = generateTOTP(user.id, timeSlot);
    setToken(newToken);
    setSecondsRemaining(getSecondsRemaining());
    return newToken;
  }, [user.id]);

  useEffect(() => {
    if (!open) return;

    // Generate initial token and update password
    const initialToken = generateNewToken();
    updateUserPassword(initialToken);

    const interval = setInterval(() => {
      const remaining = getSecondsRemaining();
      setSecondsRemaining(remaining);

      // When seconds reset to 30, generate new token
      if (remaining === 30) {
        const newToken = generateNewToken();
        updateUserPassword(newToken);
        setCopied(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, generateNewToken, updateUserPassword]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast({ title: "Token copiado al portapapeles" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo copiar el token",
      });
    }
  };

  const progressPercentage = (secondsRemaining / 30) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Token de Acceso
          </DialogTitle>
          <DialogDescription>
            Token temporal para {user.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="relative">
            <div className="flex items-center justify-center gap-3 p-6 bg-muted rounded-lg border-2 border-primary/20">
              <span className="text-4xl font-mono font-bold tracking-[0.3em] text-foreground select-all">
                {token}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
                disabled={isUpdating}
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>

            {isUpdating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Nuevo token en:</span>
              <span className="font-mono font-bold text-foreground">
                {secondsRemaining}s
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            El usuario puede iniciar sesión con este token como contraseña.
            <br />
            <span className="text-xs">Se renueva automáticamente cada 30 segundos.</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
