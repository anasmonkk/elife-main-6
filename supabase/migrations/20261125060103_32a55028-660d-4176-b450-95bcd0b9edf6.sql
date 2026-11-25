DROP FUNCTION public.get_public_virtual_offices();

CREATE VIEW public.panchayath_virtual_office_public
WITH (security_invoker = false)
AS
SELECT
  office.panchayath_id,
  p.name AS panchayath_name,
  p.district,
  p.code,
  manager.name AS office_manager_name,
  manager.role AS office_manager_role,
  manager.ward AS office_manager_ward,
  secretary.name AS office_secretary_name,
  secretary.role AS office_secretary_role,
  secretary.ward AS office_secretary_ward,
  office.updated_at
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
  );

GRANT SELECT ON public.panchayath_virtual_office_public TO anon, authenticated;

DROP POLICY "Super admins manage virtual office assignments" ON public.panchayath_virtual_offices;

CREATE POLICY "Super admins add virtual office assignments"
ON public.panchayath_virtual_offices
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admins edit virtual office assignments"
ON public.panchayath_virtual_offices
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE POLICY "Super admins remove virtual office assignments"
ON public.panchayath_virtual_offices
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_panchayath_virtual_offices_manager
  ON public.panchayath_virtual_offices(office_manager_agent_id);
CREATE INDEX IF NOT EXISTS idx_panchayath_virtual_offices_secretary
  ON public.panchayath_virtual_offices(office_secretary_agent_id);
