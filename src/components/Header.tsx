import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AvatarSelector, UserAvatar } from '@/components/ui/avatar-selector';

const Header = () => {
  const { user, profile, signOut } = useAuth();

  /* ============================================
     Colores institucionales UltraVal
     ============================================ */
  const ULTRAVAL_GREEN = "from-emerald-600 to-emerald-700";
  const ULTRAVAL_DARK = "from-slate-800 to-slate-900";

  /* Role → Color corporativo */
  const getRoleColor = (role: string) => {
    return `bg-gradient-to-r ${ULTRAVAL_GREEN} text-white`;
  };

  /* Role → Etiqueta amigable */
  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      supervisor_monitoreo: 'Supervisor de Monitoreo',
      monitor: 'Monitor',
      finanzas: 'Finanzas',
      rrhh: 'RRHH',
      supervisor_salas: 'Supervisor de Salas',
      mantenimiento: 'Mantenimiento',
      tecnico: 'Técnico',
      lector: 'Lector',
      gestor_solicitudes: 'Gestor de Solicitudes',
    };
    return labels[role as keyof typeof labels] || 'Usuario';
  };

  return (
    <div className="bg-white border-b border-emerald-200 shadow-sm">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* LOGO + TÍTULO */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center">
              <img 
                src="/lovable-uploads/asociados-ultraval.png" 
                alt="UltraVal Logo" 
                className="h-8 w-8 object-contain"
              />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-900 bg-clip-text text-transparent">
              UltraVal Secure Desk
            </h2>
          </div>

          {/* Badges de Rol */}
          {profile?.role && (
            <Badge 
              className={`${getRoleColor(profile.role)} shadow-sm border-0 px-3 py-1 text-xs font-medium`}
            >
              {getRoleLabel(profile.role)}
            </Badge>
          )}
        </div>

        {/* USUARIO */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-slate-800">
              {profile?.full_name || 'Usuario'}
            </span>
            <span className="text-xs text-slate-500">{user?.email}</span>
          </div>

          {/* MENÚ DROPDOWN */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="
                  flex items-center gap-3 
                  hover:bg-emerald-50 
                  p-2 rounded-full 
                  transition-all duration-200 
                  hover:shadow-md
                "
              >
                <UserAvatar size="sm" />
                <span className="hidden sm:inline text-sm font-medium text-slate-700">
                  Mi Cuenta
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent 
              align="end" 
              className="
                w-64 
                bg-white/95 
                backdrop-blur-sm 
                border border-emerald-200 
                shadow-lg 
                rounded-md
              "
            >
              {/* Información de usuario */}
              <DropdownMenuItem className="p-4 cursor-default hover:bg-transparent">
                <div className="flex items-center gap-3 w-full">
                  <UserAvatar size="md" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">
                      {profile?.full_name || 'Usuario'}
                    </span>
                    <span className="text-sm text-slate-600">{user?.email}</span>

                    {profile?.role && (
                      <Badge className={`${getRoleColor(profile.role)} mt-1 text-[11px] w-fit`}>
                        {getRoleLabel(profile.role)}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Avatar Selector */}
              <AvatarSelector>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-emerald-50"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Palette className="h-4 w-4 mr-3 text-emerald-700" />
                  <span className="text-emerald-700">Cambiar Avatar</span>
                </DropdownMenuItem>
              </AvatarSelector>

              <DropdownMenuSeparator />

              {/* Cerrar Sesión */}
              <DropdownMenuItem 
                onClick={signOut} 
                className="
                  text-red-600 
                  hover:bg-red-50 
                  hover:text-red-700 
                  cursor-pointer
                "
              >
                <LogOut className="h-4 w-4 mr-3" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </div>
  );
};

export default Header;
