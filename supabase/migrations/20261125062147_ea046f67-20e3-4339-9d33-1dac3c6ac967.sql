ALTER TABLE public.panchayath_virtual_office_public
  ADD COLUMN office_manager_mobile text,
  ADD COLUMN office_secretary_mobile text;

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
    office_secretary_name, office_secretary_role, office_secretary_ward,
    office_manager_mobile, office_secretary_mobile, updated_at
  )
  SELECT
    office.panchayath_id, p.name, p.district, p.code,
    manager.name, manager.role, manager.ward,
    secretary.name, secretary.role, secretary.ward,
    manager.mobile, secretary.mobile, now()
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
    office_manager_mobile = EXCLUDED.office_manager_mobile,
    office_secretary_mobile = EXCLUDED.office_secretary_mobile,
    updated_at = now();

  IF NOT FOUND THEN
    DELETE FROM public.panchayath_virtual_office_public
    WHERE panchayath_id = _panchayath_id;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS sync_virtual_office_public_after_agent_update ON public.pennyekart_agents;
CREATE TRIGGER sync_virtual_office_public_after_agent_update
AFTER UPDATE OF name, role, ward, mobile, panchayath_id, responsible_panchayath_ids, is_active
ON public.pennyekart_agents
FOR EACH ROW EXECUTE FUNCTION public.sync_panchayath_virtual_office_public();