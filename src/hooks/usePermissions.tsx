import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RolGeneral {
  id: string;
  nombre: string;
  descripcion: string;
  nivel_jerarquia: number;
  activo: boolean;
}

interface Area {
  id: string;
  nombre: string;
  descripcion: string;
}

interface PermisoSistema {
  id: string;
  rol_id: string;
  area_id: string | null;
  modulo_id: string;
  accion_id: string;
  activo: boolean;
}

interface UsePermissionsReturn {
  roles: RolGeneral[];
  areas: Area[];
  modulos: any[];
  acciones: any[];
  permisos: PermisoSistema[];
  loading: boolean;
  error: string | null;
  tienePermiso: (moduloCodigo: string, accionCodigo: string) => Promise<boolean>;
  getUserPermissions: () => Promise<PermisoSistema[]>;
  refreshPermissions: () => Promise<void>;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RolGeneral[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [modulos, setModulos] = useState<any[]>([]);
  const [acciones, setAcciones] = useState<any[]>([]);
  const [permisos, setPermisos] = useState<PermisoSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogData = async () => {
    try {
      const [rolesRes, areasRes, modulosRes, accionesRes] = await Promise.all([
        supabase.from('roles_generales').select('*').eq('activo', true),
        supabase.from('areas').select('*').eq('activo', true),
        supabase.from('modulos_sistema').select('*').eq('activo', true),
        supabase.from('acciones_sistema').select('*')
      ]);

      if (rolesRes.error) throw rolesRes.error;
    if (areasRes.error) throw areasRes.error;
    if (modulosRes.error) throw modulosRes.error;
    if (accionesRes.error) throw accionesRes.error;

    setRoles(rolesRes.data || []);
    setAreas(areasRes.data || []);
      setModulos(modulosRes.data || []);
      setAcciones(accionesRes.data || []);
    } catch (err: any) {
      console.error('Error fetching catalog data:', err);
      setError(err.message);
    }
  };

  const getUserPermissions = async (): Promise<PermisoSistema[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('permisos_sistema')
        .select(`
          *,
          roles_generales!inner(id, nombre),
          areas(id, nombre),
          modulos_sistema!inner(id, nombre, codigo),
          acciones_sistema!inner(id, nombre, codigo)
        `)
        .eq('activo', true);

      if (error) throw error;

      return (data as any) || [];
    } catch (err: any) {
      console.error('Error fetching user permissions:', err);
      return [];
    }
  };

  const tienePermiso = async (moduloCodigo: string, accionCodigo: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('usuario_tiene_permiso', {
          _user_id: user.id,
          _modulo_codigo: moduloCodigo,
          _accion_codigo: accionCodigo
        });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return data || false;
    } catch (err: any) {
      console.error('Error checking permission:', err);
      return false;
    }
  };

  const refreshPermissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await fetchCatalogData();
      const userPermisos = await getUserPermissions();
      setPermisos(userPermisos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPermissions();
  }, [user]);

  return {
    roles,
    areas,
    modulos,
    acciones,
    permisos,
    loading,
    error,
    tienePermiso,
    getUserPermissions,
    refreshPermissions
  };
};