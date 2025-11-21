
-- Primero, simplificar la tabla de salas manteniendo solo id, nombre y descripción
ALTER TABLE public.salas 
DROP COLUMN IF EXISTS ubicacion,
DROP COLUMN IF EXISTS numero_camaras;

-- Insertar las áreas requeridas si no existen
INSERT INTO public.areas (nombre, descripcion) VALUES
('Mantenimiento', 'Área encargada del mantenimiento de instalaciones y activos'),
('Logística', 'Área de logística y operaciones'),
('Finanzas', 'Área financiera y control de efectivo'),
('Supervisión Salas', 'Área de supervisión y monitoreo de salas'),
('Recursos Humanos', 'Área de gestión del personal')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar las clasificaciones de incidencias requeridas si no existen
INSERT INTO public.clasificaciones (nombre, descripcion, color) VALUES
('Uso de celulares', 'Uso inadecuado de dispositivos móviles', '#FF6B6B'),
('Ingresos tardíos', 'Llegadas tardías del personal', '#4ECDC4'),
('Cierres prematuros', 'Cierres antes del horario establecido', '#45B7D1'),
('Hurtos', 'Sustracción de bienes', '#FFA07A'),
('Faltante de efectivo', 'Diferencias en arqueos de caja', '#98D8C8'),
('Robo de efectivo', 'Sustracción de dinero', '#F7DC6F'),
('Porte y aspecto inadecuado', 'Incumplimiento de normas de presentación personal', '#BB8FCE'),
('Daño en instalaciones', 'Deterioro o daños en la infraestructura', '#85C1E9'),
('Daño en activos', 'Deterioro o daños en equipos y mobiliario', '#F8C471'),
('Conflicto verbal', 'Discusiones o altercados verbales', '#82E0AA'),
('Pantallas apagadas', 'Monitores o pantallas fuera de servicio', '#F1948A'),
('Emergencias médicas', 'Situaciones que requieren atención médica', '#D7DBDD')
ON CONFLICT (nombre) DO NOTHING;

-- Crear el mapeo automático entre clasificaciones y áreas
INSERT INTO public.clasificacion_area_mapping (clasificacion_id, area_id, prioridad_sugerida, activo)
SELECT 
    c.id as clasificacion_id,
    a.id as area_id,
    CASE 
        WHEN c.nombre IN ('Robo de efectivo', 'Emergencias médicas') THEN 'critica'
        WHEN c.nombre IN ('Hurtos', 'Faltante de efectivo', 'Daño en instalaciones', 'Daño en activos') THEN 'alta'
        WHEN c.nombre IN ('Pantallas apagadas', 'Conflicto verbal') THEN 'media'
        ELSE 'baja'
    END as prioridad_sugerida,
    true as activo
FROM public.clasificaciones c
CROSS JOIN public.areas a
WHERE 
    -- Mantenimiento
    (c.nombre IN ('Daño en instalaciones', 'Daño en activos') AND a.nombre = 'Mantenimiento')
    OR
    -- Recursos Humanos
    (c.nombre IN ('Ingresos tardíos', 'Cierres prematuros', 'Porte y aspecto inadecuado') AND a.nombre = 'Recursos Humanos')
    OR
    -- Supervisión Salas
    (c.nombre IN ('Pantallas apagadas', 'Emergencias médicas', 'Uso de celulares') AND a.nombre = 'Supervisión Salas')
    OR
    -- Finanzas
    (c.nombre IN ('Hurtos', 'Faltante de efectivo', 'Robo de efectivo') AND a.nombre = 'Finanzas')
    OR
    -- Logística (para conflicto verbal como ejemplo)
    (c.nombre IN ('Conflicto verbal') AND a.nombre = 'Logística')
ON CONFLICT (clasificacion_id, area_id) DO NOTHING;
