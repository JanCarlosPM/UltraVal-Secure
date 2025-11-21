import { useState } from "react";
import { 
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  ListChecks,
  UserCheck,
  FileBarChart,
  Settings,
  UploadCloud,
  Wallet,
  Banknote,
  Receipt,
  PackageSearch,
  MonitorCog,
  CalendarClock,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { open } = useSidebar();
  const { 
    profile, 
    isAdmin, 
    isMonitor, 
    isSupervisorMonitoreo, 
    isRRHH, 
    isSupervisorSalas, 
    isFinanzas, 
    isMantenimiento, 
    isLector, 
    isGestorSolicitudes 
  } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Contador de solicitudes nuevas (pendientes)
  const { data: solicitudesPendientes = 0 } = useQuery({
    queryKey: ['solicitudes-pendientes-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('solicitudes')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  // Definición del menú con íconos
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'nueva-incidencia', label: 'Nueva Incidencia', icon: PlusCircle, roles: ['admin', 'monitor', 'supervisor_monitoreo'] },

    // Mis incidencias asignadas al usuario
    { 
      id: 'mis-incidencias', 
      label: 'Mis Incidencias', 
      icon: ClipboardList, 
      roles: ['admin', 'supervisor_monitoreo', 'tecnico', 'mantenimiento'] 
    },

    { 
      id: 'solicitudes', 
      label: 'Gestionar Incidencias', 
      icon: ListChecks, 
      roles: ['admin', 'supervisor_monitoreo', 'monitor', 'rrhh', 'finanzas', 'supervisor_salas', 'mantenimiento', 'gestor_solicitudes'] 
    },

    { 
      id: 'gestion-pagos', 
      label: 'Gestión de Pagos', 
      icon: Banknote, 
      roles: ['admin', 'supervisor_monitoreo', 'rrhh', 'finanzas', 'mantenimiento', 'gestor_solicitudes'] 
    },

    { 
      id: 'pagos724', 
      label: 'Pagos 724', 
      icon: Receipt, 
      roles: ['admin', 'supervisor_monitoreo', 'rrhh', 'finanzas'] 
    },

    { 
      id: 'movimiento-activos', 
      label: 'Movimiento de Activos', 
      icon: PackageSearch, 
      roles: ['admin', 'supervisor_monitoreo', 'rrhh', 'finanzas', 'monitor','gestor_solicitudes'] 
    },

    { 
      id: 'billeteros', 
      label: 'Billeteros', 
      icon: Wallet, 
      roles: ['admin', 'supervisor_monitoreo', 'rrhh', 'finanzas', 'monitor', 'gestor_solicitudes'] 
    },

    { 
      id: 'borradores', 
      label: 'Asignar Incidencias', 
      icon: UserCheck, 
      roles: ['supervisor_monitoreo', 'admin'] 
    },

    { 
      id: 'consolidado', 
      label: 'Consolidado Diario', 
      icon: CalendarClock, 
      roles: ['admin', 'rrhh', 'supervisor_salas', 'finanzas', 'mantenimiento', 'lector'] 
    },

    { 
      id: 'reportes', 
      label: 'Reportes', 
      icon: FileBarChart, 
      roles: ['admin', 'rrhh', 'supervisor_salas', 'finanzas', 'mantenimiento', 'lector'] 
    },

    { 
      id: 'monitoreo-salas', 
      label: 'Monitoreo de Salas', 
      icon: MonitorCog, 
      roles: ['admin', 'rrhh', 'lector'] 
    },

    { 
      id: 'usuarios', 
      label: 'Catálogos', 
      icon: Settings, 
      roles: ['admin'] 
    },

    { 
      id: 'importar', 
      label: 'Importar Datos', 
      icon: UploadCloud, 
      roles: ['admin'] 
    },
  ];

  // Determinar roles del usuario
  const userRoles: string[] = [];
  if (isAdmin) userRoles.push('admin');
  if (isMonitor) userRoles.push('monitor');
  if (isSupervisorMonitoreo) userRoles.push('supervisor_monitoreo');
  if (isRRHH) userRoles.push('rrhh');
  if (isSupervisorSalas) userRoles.push('supervisor_salas');
  if (isFinanzas) userRoles.push('finanzas');
  if (isMantenimiento) userRoles.push('mantenimiento');
  if (isLector) userRoles.push('lector');
  if (isGestorSolicitudes) userRoles.push('gestor_solicitudes');

  // Filtrar items del menú según roles
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.some(role => userRoles.includes(role))
  );

  // Dividir items en grupos lógicos
  const mainItems = filteredMenuItems.filter(item => 
    ['dashboard'].includes(item.id)
  );
  
  const moduleItems = filteredMenuItems.filter(item => 
    ['nueva-incidencia', 'borradores', 'solicitudes', 'mis-incidencias'].includes(item.id)
  );
  
  const reportItems = filteredMenuItems.filter(item => 
    ['reportes'].includes(item.id)
  );
  
  const adminItems = filteredMenuItems.filter(item => 
    ['usuarios'].includes(item.id)
  );

  const renderMenuGroup = (items: typeof menuItems, label: string) => {
    if (items.length === 0) return null;
    
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em] px-1">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isSolicitudes = item.id === 'solicitudes';
              const hasPendientes = isSolicitudes && solicitudesPendientes > 0;
              
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => onTabChange(item.id)}
                    isActive={isActive}
                    className={`
                      w-full justify-start gap-3 rounded-md text-sm
                      transition-colors
                      ${isActive 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {hasPendientes && (
                      <Badge 
                        className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-[11px] font-semibold bg-emerald-600 text-white shadow-sm"
                      >
                        {solicitudesPendientes}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar
      className="
        border-r 
        bg-white 
        text-slate-800 
        border-emerald-200
        shadow-sm
      "
    >
      {/* HEADER */}
      <SidebarHeader className="border-b border-emerald-200 p-4 bg-emerald-600 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
          {open && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide">
                UltraVal Secure Desk
              </span>

            </div>
          )}
        </div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="flex-1 overflow-y-auto bg-white">
        <div className="space-y-3 p-2">
          {renderMenuGroup(mainItems, "Principal")}
          {renderMenuGroup(moduleItems, "Incidencias")}
          {renderMenuGroup(reportItems, "Reportes")}
          {renderMenuGroup(adminItems, "Administración")}
        </div>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="border-t border-emerald-200 p-4 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8 border border-emerald-200">
            <AvatarFallback className="bg-emerald-600 text-white text-xs">
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {open && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate text-slate-900">
                {profile?.full_name || profile?.email}
              </span>
              <span className="text-xs text-slate-500 capitalize">
                {profile?.role?.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="
            w-full justify-start gap-3 
            text-slate-600 
            hover:bg-emerald-50 
            hover:text-emerald-700
          "
        >
          <LogOut className="h-4 w-4" />
          {open && <span>Cerrar Sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
