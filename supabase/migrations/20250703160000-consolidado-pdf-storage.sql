
-- Crear bucket para almacenar PDFs de consolidados
INSERT INTO storage.buckets (id, name, public) 
VALUES ('consolidados-pdf', 'consolidados-pdf', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas de storage para PDFs de consolidados
CREATE POLICY "Administradores pueden subir PDFs de consolidados" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'consolidados-pdf' 
  AND auth.role() = 'service_role'
);

CREATE POLICY "Todos pueden ver PDFs de consolidados" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'consolidados-pdf');

-- Crear política para actualizar PDFs (sobrescribir)
CREATE POLICY "Administradores pueden actualizar PDFs de consolidados" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'consolidados-pdf' 
  AND auth.role() = 'service_role'
);

-- Crear función para programar generación automática de PDF
CREATE OR REPLACE FUNCTION public.programar_pdf_diario()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Esta función se puede llamar desde un cron job para generar PDFs automáticamente
  PERFORM net.http_post(
    url := 'https://wbuddpspfxufhftkcaww.supabase.co/functions/v1/generate-daily-pdf',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidWRkcHNwZnh1ZmhmdGtjYXd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0Mzk3NzIsImV4cCI6MjA2NjAxNTc3Mn0.TZwhCDxB-mtv9OTyVZRyzYFMNFsRUd_hNGdODMWSt10"}'::jsonb,
    body := concat('{"fecha": "', CURRENT_DATE, '"}')::jsonb
  );
END;
$$;
