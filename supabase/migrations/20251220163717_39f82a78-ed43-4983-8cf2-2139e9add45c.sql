-- Update the has_role function to treat 'gerencia' as equivalent to 'admin' using text comparison
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role::text = 'gerencia' AND _role::text = 'admin')
        OR (role::text = 'admin' AND _role::text = 'gerencia')
      )
  )
$$;