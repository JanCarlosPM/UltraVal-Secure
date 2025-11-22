import React, { useState } from 'react';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  AlertTriangle,
  FileCheck,
  Clock,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3, 
      roles: ['admin', 'supervisor_monitoreo', 'monitor'],
      path: '/'
    },
    { 
      id: 'incidencias', 
      label: 'Incidencias', 
      icon: AlertTriangle, 
      roles: ['admin', 'supervisor_monitoreo', 'monitor'],
      path: '/'
    },
    { 
      id: 'pagos724', 
      label: 'Pagos 724', 
      icon: DollarSign, 
      roles: ['admin', 'supervisor_monitoreo', 'monitor', 'rrhh', 'finanzas', 'supervisor_salas'],
      path: '/pagos724'
    },
    { 
      id: 'historial-incidencias', 
      label: 'Mis incidencias', 
      icon: MessageSquare, 
      roles: ['admin', 'supervisor_monitoreo', 'monitor'],
      path: '/mis-incidencias'
    },
    { 
      id: 'reportes', 
      label: 'Reportes', 
      icon: FileText, 
      roles: ['admin', 'supervisor_monitoreo', 'monitor'] 
    },
    { 
      id: 'borradores', 
      label: 'Borradores', 
      icon: FileCheck, 
      roles: ['admin', 'supervisor_monitoreo'] 
    },
    { 
      id: 'monitoreo-salas', 
      label: 'Monitoreo de Salas', 
      icon: Clock, 
      roles: ['admin', 'supervisor_monitoreo', 'monitor'] 
    },
    { 
      id: 'admin', 
      label: 'Admin', 
      icon: Users, 
      roles: ['admin'] 
    },
    { 
      id: 'audit', 
      label: 'Audit Log', 
      icon: Shield, 
      roles: ['admin'] 
    }
  ];

  const visibleItems = menuItems.filter(item => 
    item.roles.includes(profile?.role || '')
  );

  const handleNavigation = (item: any) => {
    if (item.path && item.path !== '/') {
      navigate(item.path);
    } else if (onTabChange) {
      onTabChange(item.id);
    }
  };

  const isItemActive = (item: any) => {
    if (item.path && item.path !== '/') {
      return location.pathname === item.path;
    }
    return activeTab === item.id;
  };

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-800">
            Sistema Monitor
          </h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant={isItemActive(item) ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    isCollapsed ? 'px-2' : 'px-4'
                  }`}
                  onClick={() => handleNavigation(item)}
                >
                  <Icon size={20} />
                  {!isCollapsed && <span className="ml-2">{item.label}</span>}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="absolute bottom-4 left-0 right-0 px-4">
        <Button
          variant="outline"
          className={`w-full ${isCollapsed ? 'px-2' : 'px-4'}`}
          onClick={handleSignOut}
        >
          <Settings size={20} />
          {!isCollapsed && <span className="ml-2">Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
