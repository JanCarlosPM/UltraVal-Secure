
import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireSupervisor?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false, requireSupervisor = false }: ProtectedRouteProps) => {
  const { user, profile, loading, isAdmin, isSupervisorMonitoreo, isRRHH, isSupervisorSalas, isFinanzas, isMonitor, isLector, isGestorSolicitudes } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // AuthProvider will redirect to AuthPage
  }

  // Verificar si el usuario tiene algún rol válido
  const hasValidRole = isAdmin || isSupervisorMonitoreo || isRRHH || isSupervisorSalas || isFinanzas || isMonitor || isLector || isGestorSolicitudes;
  
  if (!hasValidRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes un rol válido asignado para acceder al sistema.</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos de administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  if (requireSupervisor && !isSupervisorMonitoreo && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">No tienes permisos de supervisor para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
