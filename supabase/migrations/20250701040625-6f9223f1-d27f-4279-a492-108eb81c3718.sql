
-- Primero verificar qué clasificaciones están siendo referenciadas
-- y actualizar las incidencias existentes para usar solo las clasificaciones mapeadas

-- Actualizar incidencias que usan clasificaciones no mapeadas hacia la primera clasificación válida
UPDATE public.incidencias 
SET clasificacion_id = (
    SELECT c.id 
    FROM public.clasificaciones c 
    INNER JOIN public.clasificacion_area_mapping cam ON c.id = cam.clasificacion_id 
    WHERE cam.activo = true 
    LIMIT 1
)
WHERE clasificacion_id NOT IN (
    SELECT DISTINCT clasificacion_id 
    FROM public.clasificacion_area_mapping 
    WHERE activo = true
);

-- Ahora eliminar clasificaciones que no tienen mapeo con áreas
DELETE FROM public.clasificaciones 
WHERE id NOT IN (
    SELECT DISTINCT clasificacion_id 
    FROM public.clasificacion_area_mapping 
    WHERE activo = true
);

-- Actualizar incidencias que usan áreas no mapeadas hacia la primera área válida
UPDATE public.incidencias 
SET area_id = (
    SELECT a.id 
    FROM public.areas a 
    INNER JOIN public.clasificacion_area_mapping cam ON a.id = cam.area_id 
    WHERE cam.activo = true 
    LIMIT 1
)
WHERE area_id NOT IN (
    SELECT DISTINCT area_id 
    FROM public.clasificacion_area_mapping 
    WHERE activo = true
);

-- Eliminar áreas que no tienen mapeo con clasificaciones
DELETE FROM public.areas 
WHERE id NOT IN (
    SELECT DISTINCT area_id 
    FROM public.clasificacion_area_mapping 
    WHERE activo = true
);

-- Crear bucket de storage para archivos multimedia si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'incidencias-multimedia', 
    'incidencias-multimedia', 
    true, 
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas de storage permisivas (solo si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow public uploads incidencias'
    ) THEN
        CREATE POLICY "Allow public uploads incidencias" ON storage.objects
            FOR INSERT WITH CHECK (bucket_id = 'incidencias-multimedia');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow public downloads incidencias'
    ) THEN
        CREATE POLICY "Allow public downloads incidencias" ON storage.objects
            FOR SELECT USING (bucket_id = 'incidencias-multimedia');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow public updates incidencias'
    ) THEN
        CREATE POLICY "Allow public updates incidencias" ON storage.objects
            FOR UPDATE USING (bucket_id = 'incidencias-multimedia');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow public deletes incidencias'
    ) THEN
        CREATE POLICY "Allow public deletes incidencias" ON storage.objects
            FOR DELETE USING (bucket_id = 'incidencias-multimedia');
    END IF;
END
$$;
