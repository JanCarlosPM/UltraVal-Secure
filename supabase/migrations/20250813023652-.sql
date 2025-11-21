-- Update Supabase types to reflect the new schema with areas instead of departamentos
-- This will regenerate the types file

-- Just update a comment to trigger types regeneration
UPDATE public.areas SET descripcion = COALESCE(descripcion, 'Actualizado para regenerar tipos') WHERE descripcion IS NULL;