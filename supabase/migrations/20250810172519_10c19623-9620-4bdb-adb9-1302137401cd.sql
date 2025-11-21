-- Crear tabla de roles generales
CREATE TABLE public.roles_generales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  nivel_jerarquia INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar roles generales base
INSERT INTO public.roles_generales (nombre, descripcion, nivel_jerarquia) VALUES
('administrador', 'Acceso completo al sistema', 1),
('supervisor', 'Supervisión y gestión de áreas específicas', 2),
('empleado', 'Acceso básico según área asignada', 3),
('lector', 'Solo lectura según área asignada', 4);

-- Crear tabla de departamentos/áreas (renombrar la tabla areas existente)
ALTER TABLE public.areas RENAME TO areas_old;

CREATE TABLE public.departamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  codigo VARCHAR(20) UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Migrar datos de areas existentes a departamentos
INSERT INTO public.departamentos (id, nombre, descripcion, activo, created_at, updated_at)
SELECT id, nombre, descripcion, activo, created_at, updated_at
FROM public.areas_old;

-- Crear tabla de módulos del sistema
CREATE TABLE public.modulos_sistema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar módulos del sistema existentes
INSERT INTO public.modulos_sistema (nombre, descripcion, codigo) VALUES
('dashboard', 'Panel principal con estadísticas', 'dashboard'),
('incidencias', 'Gestión de incidencias', 'incidencias'),
('reportes', 'Visualización de reportes', 'reportes'),
('solicitudes', 'Gestión de solicitudes', 'solicitudes'),
('monitoreo', 'Monitoreo de salas y máquinas', 'monitoreo'),
('administracion', 'Configuración del sistema', 'admin'),
('auditoria', 'Registro de auditoría', 'auditoria');

-- Crear tabla de acciones
CREATE TABLE public.acciones_sistema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT,
  codigo VARCHAR(30) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(codigo)
);

-- Insertar acciones base
INSERT INTO public.acciones_sistema (nombre, descripcion, codigo) VALUES
('ver', 'Visualizar información', 'read'),
('crear', 'Crear nuevos registros', 'create'),
('editar', 'Modificar registros existentes', 'update'),
('eliminar', 'Eliminar registros', 'delete'),
('aprobar', 'Aprobar solicitudes/incidencias', 'approve'),
('administrar', 'Configuración avanzada', 'admin');

-- Crear tabla de permisos (rol + departamento + módulo + acciones)
CREATE TABLE public.permisos_sistema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rol_id UUID NOT NULL REFERENCES public.roles_generales(id) ON DELETE CASCADE,
  departamento_id UUID REFERENCES public.departamentos(id) ON DELETE CASCADE,
  modulo_id UUID NOT NULL REFERENCES public.modulos_sistema(id) ON DELETE CASCADE,
  accion_id UUID NOT NULL REFERENCES public.acciones_sistema(id) ON DELETE CASCADE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rol_id, departamento_id, modulo_id, accion_id)
);

-- Agregar columnas a la tabla profiles para el nuevo modelo
ALTER TABLE public.profiles 
ADD COLUMN rol_general_id UUID REFERENCES public.roles_generales(id),
ADD COLUMN departamento_id UUID REFERENCES public.departamentos(id);

-- Migrar datos existentes al nuevo modelo
-- Administradores
UPDATE public.profiles 
SET rol_general_id = (SELECT id FROM public.roles_generales WHERE nombre = 'administrador')
WHERE role = 'admin';

-- Supervisores de monitoreo
UPDATE public.profiles 
SET rol_general_id = (SELECT id FROM public.roles_generales WHERE nombre = 'supervisor')
WHERE role = 'supervisor_monitoreo';

-- Monitores y otros roles técnicos como empleados
UPDATE public.profiles 
SET rol_general_id = (SELECT id FROM public.roles_generales WHERE nombre = 'empleado')
WHERE role IN ('monitor', 'tecnico', 'mantenimiento');

-- Roles de áreas específicas como empleados con departamento asignado
UPDATE public.profiles 
SET rol_general_id = (SELECT id FROM public.roles_generales WHERE nombre = 'empleado')
WHERE role IN ('rrhh', 'finanzas', 'supervisor_salas');

-- Lector
UPDATE public.profiles 
SET rol_general_id = (SELECT id FROM public.roles_generales WHERE nombre = 'lector')
WHERE role = 'lector';

-- Gestor de solicitudes como empleado
UPDATE public.profiles 
SET rol_general_id = (SELECT id FROM public.roles_generales WHERE nombre = 'empleado')
WHERE role = 'gestor_solicitudes';

-- Crear función para verificar permisos
CREATE OR REPLACE FUNCTION public.usuario_tiene_permiso(
  _user_id UUID, 
  _modulo_codigo TEXT, 
  _accion_codigo TEXT
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.permisos_sistema ps ON ps.rol_id = p.rol_general_id
    JOIN public.modulos_sistema ms ON ms.id = ps.modulo_id
    JOIN public.acciones_sistema as_table ON as_table.id = ps.accion_id
    WHERE p.id = _user_id
      AND ms.codigo = _modulo_codigo
      AND as_table.codigo = _accion_codigo
      AND ps.activo = true
      AND (ps.departamento_id IS NULL OR ps.departamento_id = p.departamento_id)
  ) OR EXISTS (
    -- Los administradores tienen acceso completo
    SELECT 1
    FROM public.profiles p
    JOIN public.roles_generales rg ON rg.id = p.rol_general_id
    WHERE p.id = _user_id AND rg.nombre = 'administrador'
  );
$$;

-- Configurar permisos iniciales para administradores (acceso completo)
INSERT INTO public.permisos_sistema (rol_id, departamento_id, modulo_id, accion_id)
SELECT 
  rg.id as rol_id,
  NULL as departamento_id,
  ms.id as modulo_id,
  acs.id as accion_id
FROM public.roles_generales rg
CROSS JOIN public.modulos_sistema ms
CROSS JOIN public.acciones_sistema acs
WHERE rg.nombre = 'administrador';

-- Configurar permisos básicos para empleados (lectura en la mayoría de módulos)
INSERT INTO public.permisos_sistema (rol_id, departamento_id, modulo_id, accion_id)
SELECT 
  rg.id as rol_id,
  NULL as departamento_id,
  ms.id as modulo_id,
  acs.id as accion_id
FROM public.roles_generales rg
CROSS JOIN public.modulos_sistema ms
CROSS JOIN public.acciones_sistema acs
WHERE rg.nombre = 'empleado'
  AND ms.codigo IN ('dashboard', 'incidencias', 'reportes', 'solicitudes', 'monitoreo')
  AND acs.codigo IN ('read', 'create');

-- Configurar permisos para supervisores
INSERT INTO public.permisos_sistema (rol_id, departamento_id, modulo_id, accion_id)
SELECT 
  rg.id as rol_id,
  NULL as departamento_id,
  ms.id as modulo_id,
  acs.id as accion_id
FROM public.roles_generales rg
CROSS JOIN public.modulos_sistema ms
CROSS JOIN public.acciones_sistema acs
WHERE rg.nombre = 'supervisor'
  AND ms.codigo IN ('dashboard', 'incidencias', 'reportes', 'solicitudes', 'monitoreo')
  AND acs.codigo IN ('read', 'create', 'update', 'approve');

-- Configurar permisos para lectores (solo lectura)
INSERT INTO public.permisos_sistema (rol_id, departamento_id, modulo_id, accion_id)
SELECT 
  rg.id as rol_id,
  NULL as departamento_id,
  ms.id as modulo_id,
  acs.id as accion_id
FROM public.roles_generales rg
CROSS JOIN public.modulos_sistema ms
CROSS JOIN public.acciones_sistema acs
WHERE rg.nombre = 'lector'
  AND ms.codigo IN ('dashboard', 'incidencias', 'reportes', 'solicitudes', 'monitoreo')
  AND acs.codigo = 'read';

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.roles_generales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modulos_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acciones_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para roles_generales
CREATE POLICY "Usuarios autenticados pueden ver roles generales" ON public.roles_generales
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar roles generales" ON public.roles_generales
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles_generales rg ON rg.id = p.rol_general_id
    WHERE p.id = auth.uid() AND rg.nombre = 'administrador'
  )
);

-- Políticas RLS para departamentos
CREATE POLICY "Usuarios autenticados pueden ver departamentos" ON public.departamentos
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar departamentos" ON public.departamentos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles_generales rg ON rg.id = p.rol_general_id
    WHERE p.id = auth.uid() AND rg.nombre = 'administrador'
  )
);

-- Políticas RLS para módulos_sistema
CREATE POLICY "Usuarios autenticados pueden ver módulos" ON public.modulos_sistema
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar módulos" ON public.modulos_sistema
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles_generales rg ON rg.id = p.rol_general_id
    WHERE p.id = auth.uid() AND rg.nombre = 'administrador'
  )
);

-- Políticas RLS para acciones_sistema
CREATE POLICY "Usuarios autenticados pueden ver acciones" ON public.acciones_sistema
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar acciones" ON public.acciones_sistema
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles_generales rg ON rg.id = p.rol_general_id
    WHERE p.id = auth.uid() AND rg.nombre = 'administrador'
  )
);

-- Políticas RLS para permisos_sistema
CREATE POLICY "Usuarios autenticados pueden ver permisos" ON public.permisos_sistema
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo administradores pueden modificar permisos" ON public.permisos_sistema
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles_generales rg ON rg.id = p.rol_general_id
    WHERE p.id = auth.uid() AND rg.nombre = 'administrador'
  )
);

-- Crear triggers para updated_at
CREATE TRIGGER update_roles_generales_updated_at
  BEFORE UPDATE ON public.roles_generales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departamentos_updated_at
  BEFORE UPDATE ON public.departamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modulos_sistema_updated_at
  BEFORE UPDATE ON public.modulos_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permisos_sistema_updated_at
  BEFORE UPDATE ON public.permisos_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();