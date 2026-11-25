CREATE TABLE public.panchayath_virtual_offices (
  panchayath_id uuid PRIMARY KEY REFERENCES public.panchayaths(id) ON DELETE CASCADE,
  office_manager_agent_id uuid REFERENCES public.pennyekart_agents(id) ON DELETE SET NULL,
  office_secretary_agent_id uuid REFERENCES public.pennyekart_agents(id) ON DELETE SET NULL,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.panchayath_virtual_offices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.panchayath_virtual_offices TO authenticated;
GRANT ALL ON public.panchayath_virtual_offices TO service_role;

ALTER TABLE public.panchayath_virtual_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view virtual office assignments"
ON public.panchayath_virtual_offices
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Super admins manage virtual office assignments"
ON public.panchayath_virtual_offices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.validate_panchayath_virtual_office()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  manager_is_valid boolean;
  secretary_is_valid boolean;
BEGIN
  IF NEW.office_manager_agent_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.pennyekart_agents a
      WHERE a.id = NEW.office_manager_agent_id
        AND a.role = 'coordinator'
        AND a.panchayath_id = NEW.panchayath_id
        AND a.is_active IS DISTINCT FROM false
    ) INTO manager_is_valid;

    IF NOT manager_is_valid THEN
      RAISE EXCEPTION 'Office Manager must be an active Coordinator from this Panchayath';
    END IF;
  END IF;

  IF NEW.office_secretary_agent_id IS NOT NULL THEN
    WITH RECURSIVE role_chain(key, parent_key) AS (
      SELECT r.key, r.parent_key
      FROM public.pennyekart_agents a
      JOIN public.pennyekart_agent_roles r ON r.key = a.role AND r.is_active
      WHERE a.id = NEW.office_secretary_agent_id
        AND a.is_active IS DISTINCT FROM false
        AND (
          a.panchayath_id = NEW.panchayath_id
          OR NEW.panchayath_id = ANY(COALESCE(a.responsible_panchayath_ids, ARRAY[]::uuid[]))
        )
      UNION ALL
      SELECT parent.key, parent.parent_key
      FROM public.pennyekart_agent_roles parent
      JOIN role_chain child ON child.parent_key = parent.key
      WHERE parent.is_active
    )
    SELECT EXISTS (SELECT 1 FROM role_chain WHERE key = 'team_leader')
      AND EXISTS (
        SELECT 1
        FROM public.pennyekart_agents a
        JOIN public.pennyekart_agent_roles r ON r.key = a.role AND r.is_active
        WHERE a.id = NEW.office_secretary_agent_id
          AND a.is_active IS DISTINCT FROM false
          AND (
            a.panchayath_id = NEW.panchayath_id
            OR NEW.panchayath_id = ANY(COALESCE(a.responsible_panchayath_ids, ARRAY[]::uuid[]))
          )
      )
    INTO secretary_is_valid;

    IF NOT secretary_is_valid THEN
      RAISE EXCEPTION 'Office Secretary must be an active agent in this Panchayath hierarchy';
    END IF;
  END IF;

  IF NEW.office_manager_agent_id IS NOT NULL
    AND NEW.office_manager_agent_id = NEW.office_secretary_agent_id THEN
    RAISE EXCEPTION 'Office Manager and Office Secretary must be different people';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_panchayath_virtual_office_before_write
BEFORE INSERT OR UPDATE ON public.panchayath_virtual_offices
FOR EACH ROW
EXECUTE FUNCTION public.validate_panchayath_virtual_office();

CREATE OR REPLACE FUNCTION public.get_public_virtual_offices()
RETURNS TABLE (
  panchayath_id uuid,
  panchayath_name text,
  district text,
  code text,
  office_manager_name text,
  office_manager_role text,
  office_manager_ward text,
  office_secretary_name text,
  office_secretary_role text,
  office_secretary_ward text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    office.panchayath_id,
    p.name,
    p.district,
    p.code,
    manager.name,
    manager.role,
    manager.ward,
    secretary.name,
    secretary.role,
    secretary.ward,
    office.updated_at
  FROM public.panchayath_virtual_offices office
  JOIN public.panchayaths p ON p.id = office.panchayath_id AND p.is_active IS DISTINCT FROM false
  LEFT JOIN public.pennyekart_agents manager
    ON manager.id = office.office_manager_agent_id
    AND manager.role = 'coordinator'
    AND manager.panchayath_id = office.panchayath_id
    AND manager.is_active IS DISTINCT FROM false
  LEFT JOIN public.pennyekart_agents secretary
    ON secretary.id = office.office_secretary_agent_id
    AND secretary.is_active IS DISTINCT FROM false
    AND secretary.role <> 'super_admin_partner'
    AND (
      secretary.panchayath_id = office.panchayath_id
      OR office.panchayath_id = ANY(COALESCE(secretary.responsible_panchayath_ids, ARRAY[]::uuid[]))
    )
  ORDER BY p.name;
$$;

REVOKE ALL ON FUNCTION public.get_public_virtual_offices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_virtual_offices() TO anon, authenticated;
