-- Probar si la función has_role funciona para este usuario
SELECT has_role('e8d3dabe-ce63-4f23-a46a-e988d0892e3e'::uuid, 'rrhh'::app_role) as tiene_rol_rrhh;

-- Verificar estructura de profiles
SELECT id, email, role FROM profiles WHERE email = 'carlos.mendoza4002@gmail.com';