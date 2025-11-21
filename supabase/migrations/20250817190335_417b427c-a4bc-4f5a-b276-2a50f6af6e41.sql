-- Eliminar todas las políticas de INSERT existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear solicitudes" ON public.solicitudes;

-- Crear política temporal muy permisiva para debug
CREATE POLICY "Permitir INSERT a usuarios autenticados" 
ON public.solicitudes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = solicitante_id);

-- Verificar que RLS esté habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'solicitudes';