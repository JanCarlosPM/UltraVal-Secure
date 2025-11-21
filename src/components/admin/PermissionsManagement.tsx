import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Plus, Edit, Trash2, Shield, Users, Building2 } from 'lucide-react';

interface RolGeneral {
  id: string;
  nombre: string;
  descripcion: string;
  nivel_jerarquia: number;
  activo: boolean;
}

interface Departamento {
  id: string;
  nombre: string;
  descripcion: string;
  codigo: string;
  activo: boolean;
}

interface ModuloSistema {
  id: string;
  nombre: string;
  descripcion: string;
  codigo: string;
  activo: boolean;
}

interface AccionSistema {
  id: string;
  nombre: string;
  codigo: string;
}

interface PermisoCompleto {
  id: string;
  rol_id: string;
  departamento_id: string | null;
  modulo_id: string;
  accion_id: string;
  activo: boolean;
  rol_nombre: string;
  departamento_nombre: string | null;
  modulo_nombre: string;
  modulo_codigo: string;
  accion_nombre: string;
  accion_codigo: string;
}

export const PermissionsManagement = () => {
  const [roles, setRoles] = useState<RolGeneral[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [modulos, setModulos] = useState<ModuloSistema[]>([]);
  const [acciones, setAcciones] = useState<AccionSistema[]>([]);
  const [permisos, setPermisos] = useState<PermisoCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('permisos');

  // Estados para formularios
  const [selectedRol, setSelectedRol] = useState<string>('');
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
  const [selectedModulo, setSelectedModulo] = useState<string>('');
  const [selectedAcciones, setSelectedAcciones] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, deptosRes, modulosRes, accionesRes, permisosRes] = await Promise.all([
        supabase.from('roles_generales').select('*').order('nivel_jerarquia'),
        supabase.from('areas').select('*').order('nombre'),
        supabase.from('modulos_sistema').select('*').order('nombre'),
        supabase.from('acciones_sistema').select('*').order('nombre'),
        supabase
          .from('permisos_sistema')
          .select(`
            *,
            rol:roles_generales(nombre),
            area:areas(nombre),
            modulo:modulos_sistema(nombre, codigo),
            accion:acciones_sistema(nombre, codigo)
          `)
          .order('created_at', { ascending: false })
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (deptosRes.error) throw deptosRes.error;
      if (modulosRes.error) throw modulosRes.error;
      if (accionesRes.error) throw accionesRes.error;
      if (permisosRes.error) throw permisosRes.error;

      setRoles(rolesRes.data || []);
      setDepartamentos((deptosRes.data || []).map(area => ({ ...area, codigo: area.id })));
      setModulos(modulosRes.data || []);
      setAcciones(accionesRes.data || []);

      // Transformar permisos para mostrar los nombres
      const permisosTransformados = (permisosRes.data || []).map(p => ({
        id: p.id,
        rol_id: p.rol_id,
        departamento_id: p.area_id,
        modulo_id: p.modulo_id,
        accion_id: p.accion_id,
        activo: p.activo,
        rol_nombre: p.rol?.nombre || 'Sin rol',
        departamento_nombre: (p.area as any)?.nombre || null,
        modulo_nombre: p.modulo?.nombre || 'Sin módulo',
        modulo_codigo: p.modulo?.codigo || '',
        accion_nombre: p.accion?.nombre || 'Sin acción',
        accion_codigo: p.accion?.codigo || ''
      }));

      setPermisos(permisosTransformados);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePermissions = async () => {
    if (!selectedRol || !selectedModulo || selectedAcciones.length === 0) {
      toast.error('Selecciona rol, módulo y al menos una acción');
      return;
    }

    try {
      const permisosToCreate = selectedAcciones.map(accionId => ({
        rol_id: selectedRol,
        area_id: selectedDepartamento || null,
        modulo_id: selectedModulo,
        accion_id: accionId,
        activo: true
      }));

      const { error } = await supabase
        .from('permisos_sistema')
        .insert(permisosToCreate);

      if (error) throw error;

      toast.success('Permisos creados exitosamente');
      setSelectedRol('');
      setSelectedDepartamento('');
      setSelectedModulo('');
      setSelectedAcciones([]);
      fetchData();
    } catch (error: any) {
      console.error('Error creating permissions:', error);
      toast.error('Error al crear permisos: ' + error.message);
    }
  };

  const handleTogglePermiso = async (permisoId: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('permisos_sistema')
        .update({ activo })
        .eq('id', permisoId);

      if (error) throw error;

      toast.success(activo ? 'Permiso activado' : 'Permiso desactivado');
      fetchData();
    } catch (error: any) {
      console.error('Error toggling permission:', error);
      toast.error('Error al actualizar permiso: ' + error.message);
    }
  };

  const handleDeletePermiso = async (permisoId: string) => {
    try {
      const { error } = await supabase
        .from('permisos_sistema')
        .delete()
        .eq('id', permisoId);

      if (error) throw error;

      toast.success('Permiso eliminado');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting permission:', error);
      toast.error('Error al eliminar permiso: ' + error.message);
    }
  };

  const getPermissionsByRole = () => {
    const grouped = permisos.reduce((acc, permiso) => {
      if (!acc[permiso.rol_nombre]) {
        acc[permiso.rol_nombre] = [];
      }
      acc[permiso.rol_nombre].push(permiso);
      return acc;
    }, {} as Record<string, PermisoCompleto[]>);

    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h2>
          <p className="text-gray-600">Configuración del sistema de permisos basado en roles y departamentos</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="permisos" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permisos
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="departamentos" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="configuracion" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permisos" className="space-y-6">
          {/* Formulario para crear permisos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Crear Nuevos Permisos
              </CardTitle>
              <CardDescription>
                Asigna permisos específicos a roles y departamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rol</label>
                  <Select value={selectedRol} onValueChange={setSelectedRol}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(rol => (
                        <SelectItem key={rol.id} value={rol.id}>
                          {rol.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Departamento (Opcional)</label>
                  <Select value={selectedDepartamento} onValueChange={setSelectedDepartamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los departamentos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los departamentos</SelectItem>
                      {departamentos.map(depto => (
                        <SelectItem key={depto.id} value={depto.id}>
                          {depto.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Módulo</label>
                  <Select value={selectedModulo} onValueChange={setSelectedModulo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      {modulos.map(modulo => (
                        <SelectItem key={modulo.id} value={modulo.id}>
                          {modulo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Acciones</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {acciones.map(accion => (
                      <div key={accion.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={accion.id}
                          checked={selectedAcciones.includes(accion.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAcciones([...selectedAcciones, accion.id]);
                            } else {
                              setSelectedAcciones(selectedAcciones.filter(id => id !== accion.id));
                            }
                          }}
                        />
                        <label htmlFor={accion.id} className="text-sm">
                          {accion.nombre}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={handleCreatePermissions} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Crear Permisos
              </Button>
            </CardContent>
          </Card>

          {/* Lista de permisos por rol */}
          <div className="space-y-4">
            {Object.entries(getPermissionsByRole()).map(([rolNombre, permisosRol]) => (
              <Card key={rolNombre}>
                <CardHeader>
                  <CardTitle className="text-lg">{rolNombre}</CardTitle>
                  <CardDescription>
                    {permisosRol.length} permiso(s) configurado(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {permisosRol.map(permiso => (
                      <div key={permiso.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{permiso.modulo_nombre}</Badge>
                            <Badge variant="secondary">{permiso.accion_nombre}</Badge>
                            {permiso.departamento_nombre && (
                              <Badge variant="outline">{permiso.departamento_nombre}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {permiso.departamento_nombre ? 
                              `Específico para ${permiso.departamento_nombre}` : 
                              'Aplica a todos los departamentos'
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={permiso.activo}
                            onCheckedChange={(checked) => 
                              handleTogglePermiso(permiso.id, !!checked)
                            }
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePermiso(permiso.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Roles del Sistema</CardTitle>
              <CardDescription>
                Gestión de roles generales del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roles.map(rol => (
                  <div key={rol.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{rol.nombre}</h4>
                      <p className="text-sm text-gray-600">{rol.descripcion}</p>
                      <Badge variant="outline">Nivel {rol.nivel_jerarquia}</Badge>
                    </div>
                    <Badge variant={rol.activo ? "default" : "secondary"}>
                      {rol.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departamentos">
          <Card>
            <CardHeader>
              <CardTitle>Departamentos del Sistema</CardTitle>
              <CardDescription>
                Gestión de departamentos y áreas organizacionales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departamentos.map(depto => (
                  <div key={depto.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{depto.nombre}</h4>
                      <p className="text-sm text-gray-600">{depto.descripcion}</p>
                      {depto.codigo && (
                        <Badge variant="outline">{depto.codigo}</Badge>
                      )}
                    </div>
                    <Badge variant={depto.activo ? "default" : "secondary"}>
                      {depto.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracion">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Módulos del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {modulos.map(modulo => (
                    <div key={modulo.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{modulo.nombre}</span>
                        <span className="text-sm text-gray-600 ml-2">({modulo.codigo})</span>
                      </div>
                      <Badge variant={modulo.activo ? "default" : "secondary"}>
                        {modulo.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acciones del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {acciones.map(accion => (
                    <div key={accion.id} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{accion.nombre}</span>
                      <Badge variant="outline">{accion.codigo}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};