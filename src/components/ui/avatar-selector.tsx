import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

const avatarOptions = [
  { id: 'avatar-1', name: 'Avatar 1', emoji: '👨‍💼' },
  { id: 'avatar-2', name: 'Avatar 2', emoji: '👩‍💼' },
  { id: 'avatar-3', name: 'Avatar 3', emoji: '👨‍🔧' },
  { id: 'avatar-4', name: 'Avatar 4', emoji: '👩‍🔧' },
  { id: 'avatar-5', name: 'Avatar 5', emoji: '👨‍🎓' },
  { id: 'avatar-6', name: 'Avatar 6', emoji: '👩‍🎓' },
  { id: 'avatar-7', name: 'Avatar 7', emoji: '👨‍⚕️' },
  { id: 'avatar-8', name: 'Avatar 8', emoji: '👩‍⚕️' },
  { id: 'avatar-9', name: 'Avatar 9', emoji: '👨‍💻' },
  { id: 'avatar-10', name: 'Avatar 10', emoji: '👩‍💻' },
  { id: 'avatar-11', name: 'Avatar 11', emoji: '👨‍🏫' },
  { id: 'avatar-12', name: 'Avatar 12', emoji: '👩‍🏫' },
];

interface AvatarSelectorProps {
  children: React.ReactNode;
}

export function AvatarSelector({ children }: AvatarSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();

  const handleAvatarSelect = async (avatarId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await updateProfile({ avatar_url: avatarId });
      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el avatar",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Avatar actualizado",
          description: "Tu avatar se ha actualizado correctamente",
        });
        setOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getAvatarEmoji = (avatarId: string | null) => {
    const avatar = avatarOptions.find(a => a.id === avatarId);
    return avatar?.emoji || '👤';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Elige tu avatar</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-4 py-4">
          {avatarOptions.map((avatar) => (
            <Button
              key={avatar.id}
              variant={profile?.avatar_url === avatar.id ? "default" : "outline"}
              className="h-16 w-16 p-0 text-2xl hover:scale-105 transition-transform"
              onClick={() => handleAvatarSelect(avatar.id)}
              disabled={isUpdating}
            >
              {avatar.emoji}
            </Button>
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Avatar actual: {getAvatarEmoji(profile?.avatar_url)} 
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UserAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ size = "md", className = "" }: UserAvatarProps) {
  const { profile } = useAuth();
  
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-lg", 
    lg: "h-12 w-12 text-xl"
  };

  const getAvatarEmoji = (avatarId: string | null) => {
    const avatar = avatarOptions.find(a => a.id === avatarId);
    return avatar?.emoji || '👤';
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getAvatarEmoji(profile?.avatar_url)}
      </AvatarFallback>
    </Avatar>
  );
}