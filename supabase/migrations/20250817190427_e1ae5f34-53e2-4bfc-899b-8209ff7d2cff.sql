-- Verificar si auth.uid() está funcionando correctamente
SELECT auth.uid() as current_user_id, auth.role() as current_role;

-- Temporalmente deshabilitar RLS para testing
ALTER TABLE public.solicitudes DISABLE ROW LEVEL SECURITY;

-- Verificar el estado de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'solicitudes';