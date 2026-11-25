DROP VIEW public.panchayath_virtual_office_public;
REVOKE SELECT ON public.panchayath_virtual_offices FROM anon;
DROP POLICY "Anyone can view virtual office assignments" ON public.panchayath_virtual_offices;

CREATE POLICY "Super admins view virtual office assignments"
ON public.panchayath_virtual_offices
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE TABLE public.panchayath_virtual_office_public (
  panchayath_id uuid PRIMARY KEY REFERENCES public.panchayaths(id) ON DELETE CASCADE,
  panchayath_name text NOT NULL,
  district text,
  code text,
  office_manager_name text,
  office_manager_role text,
  office_manager_ward text,
  office_secretary_name text,
  office_secretary_role text,
  office_secretary_ward text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.panchayath_virtual_office_public TO anon, authenticated;
GRANT ALL ON public.panchayath_virtual_office_public TO service_role;

ALTER TABLE public.panchayath_virtual_office_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published virtual office contacts"
ON public.panchayath_virtual_office_public
FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.refresh_panchayath_virtual_office_public(_panchayath_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.panchayath_virtual_office_public (
    panchayath_id, panchayath_name, district, code,
    office_manager_name, office_manager_role, office_manager_ward,
    office_secretary_name, office_secretary_role, office_secretary_ward, updated_at
  )
  SELECT
    office.panchayath_id, p.name, p.district, p.code,
    manager.name, manager.role, manager.ward,
    secretary.name, secretary.role, secretary.ward, now()
  FROM public.panchayath_virtual_offices office
  JOIN public.panchayaths p
    ON p.id = office.panchayath_id
    AND p.is_active IS DISTINCT FROM false
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
  WHERE office.panchayath_id = _panchayath_id
  ON CONFLICT (panchayath_id) DO UPDATE SET
    panchayath_name = EXCLUDED.panchayath_name,
    district = EXCLUDED.district,
    code = EXCLUDED.code,
    office_manager_name = EXCLUDED.office_manager_name,
    office_manager_role = EXCLUDED.office_manager_role,
    office_manager_ward = EXCLUDED.office_manager_ward,
    office_secretary_name = EXCLUDED.office_secretary_name,
    office_secretary_role = EXCLUDED.office_secretary_role,
    office_secretary_ward = EXCLUDED.office_secretary_ward,
    updated_at = now();

  IF NOT FOUND THEN
    DELETE FROM public.panchayath_virtual_office_public
    WHERE panchayath_id = _panchayath_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_panchayath_virtual_office_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_panchayath_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'panchayath_virtual_offices' THEN
    IF TG_OP = 'DELETE' THEN
      PERFORM public.refresh_panchayath_virtual_office_public(OLD.panchayath_id);
      RETURN OLD;
    END IF;

    PERFORM public.refresh_panchayath_virtual_office_public(NEW.panchayath_id);
    IF TG_OP = 'UPDATE' AND OLD.panchayath_id IS DISTINCT FROM NEW.panchayath_id THEN
      PERFORM public.refresh_panchayath_virtual_office_public(OLD.panchayath_id);
    END IF;
    RETURN NEW;
  END IF;

  FOR affected_panchayath_id IN
    SELECT DISTINCT office.panchayath_id
    FROM public.panchayath_virtual_offices office
    WHERE office.office_manager_agent_id IN (OLD.id, NEW.id)
       OR office.office_secretary_agent_id IN (OLD.id, NEW.id)
  LOOP
    PERFORM public.refresh_panchayath_virtual_office_public(affected_panchayath_id);
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_panchayath_virtual_office_public(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_panchayath_virtual_office_public() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER sync_virtual_office_public_after_assignment
AFTER INSERT OR UPDATE OR DELETE ON public.panchayath_virtual_offices
FOR EACH ROW EXECUTE FUNCTION public.sync_panchayath_virtual_office_public();

CREATE TRIGGER sync_virtual_office_public_after_agent_update
AFTER UPDATE OF name, role, ward, panchayath_id, responsible_panchayath_ids, is_active
ON public.pennyekart_agents
FOR EACH ROW EXECUTE FUNCTION public.sync_panchayath_virtual_office_public();
