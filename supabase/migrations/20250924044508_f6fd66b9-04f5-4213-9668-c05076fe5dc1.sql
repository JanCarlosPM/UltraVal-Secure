-- Fix search_path for the new functions to resolve security warnings
DROP FUNCTION IF EXISTS public.generar_codigo_activo();
DROP FUNCTION IF EXISTS public.validar_codigo_activo(TEXT, UUID);

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.generar_codigo_activo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nuevo_codigo TEXT;
  codigo_existe BOOLEAN;
  contador INTEGER := 1;
BEGIN
  LOOP
    -- Generar código con formato TR + número de 6 dígitos
    nuevo_codigo := 'TR' || LPAD(contador::TEXT, 6, '0');
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM public.activos_salas WHERE codigo = nuevo_codigo) INTO codigo_existe;
    
    -- Si no existe, devolver el código
    IF NOT codigo_existe THEN
      RETURN nuevo_codigo;
    END IF;
    
    contador := contador + 1;
  END LOOP;
END;
$$;

-- Función para validar código único
CREATE OR REPLACE FUNCTION public.validar_codigo_activo(p_codigo TEXT, p_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar formato del código
  IF p_codigo !~ '^TR[0-9A-Z]+$' THEN
    RAISE EXCEPTION 'El código debe iniciar con TR seguido de números o letras mayúsculas';
  END IF;
  
  -- Verificar si el código ya existe (excluyendo el registro actual en caso de actualización)
  IF EXISTS (
    SELECT 1 FROM public.activos_salas 
    WHERE codigo = p_codigo 
    AND (p_id IS NULL OR id != p_id)
  ) THEN
    RAISE EXCEPTION 'El código % ya existe. Por favor, use un código diferente.', p_codigo;
  END IF;
  
  RETURN TRUE;
END;
$$;