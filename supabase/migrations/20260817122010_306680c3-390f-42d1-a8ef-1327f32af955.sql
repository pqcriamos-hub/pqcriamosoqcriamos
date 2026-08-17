-- Data API grants (authenticated previously had SELECT only)
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Admins can read every role row
CREATE POLICY "Admins can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Admins can grant roles
CREATE POLICY "Admins can grant roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Admins can revoke roles, but never their own admin role (anti-lockout)
CREATE POLICY "Admins can revoke roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  AND NOT (user_id = auth.uid() AND role = 'admin'::app_role)
);

-- Resolve a confirmed account id from an email (admins only)
CREATE OR REPLACE FUNCTION public.admin_lookup_user_id(_email text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT u.id INTO _id
  FROM auth.users u
  WHERE lower(u.email) = lower(trim(_email))
    AND u.email_confirmed_at IS NOT NULL
  LIMIT 1;

  IF _id IS NULL THEN
    RAISE EXCEPTION 'Conta não encontrada ou e-mail não confirmado.';
  END IF;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_lookup_user_id(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_lookup_user_id(text) TO authenticated, service_role;

-- List roles together with account email (admins only)
CREATE OR REPLACE FUNCTION public.admin_list_access()
RETURNS TABLE (id uuid, user_id uuid, email text, role app_role, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id, u.email::text, r.role, r.created_at
  FROM public.user_roles r
  LEFT JOIN auth.users u ON u.id = r.user_id
  ORDER BY u.email NULLS LAST, r.role;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_access() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_access() TO authenticated, service_role;