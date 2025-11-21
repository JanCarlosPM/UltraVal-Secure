-- Agregar campo avatar_url a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN avatar_url TEXT;

-- Actualizar la función handle_new_user para incluir avatar por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'monitor',
    'avatar-1' -- Avatar por defecto
  );
  RETURN NEW;
END;
$$;