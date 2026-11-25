export interface OfficeAgent {
  id: string;
  name: string;
  role: string;
  panchayath_id: string;
  ward: string;
  is_active: boolean | null;
  responsible_panchayath_ids: string[] | null;
}

export interface OfficeHierarchyRole {
  key: string;
  parent_key: string | null;
  is_active: boolean;
}

export function getEligibleOfficeManagers<T extends OfficeAgent>(
  agents: T[],
  panchayathId: string,
): T[] {
  return agents.filter(
    (agent) =>
      agent.role === "coordinator" &&
      agent.panchayath_id === panchayathId &&
      agent.is_active !== false,
  );
}

export function getEligibleOfficeSecretaries<T extends OfficeAgent>(
  agents: T[],
  roles: OfficeHierarchyRole[],
  panchayathId: string,
): T[] {
  const activeRoles = roles.filter((role) => role.is_active);
  const rolesByKey = new Map(activeRoles.map((role) => [role.key, role]));

  const isInHierarchy = (roleKey: string) => {
    const visited = new Set<string>();
    let current: OfficeHierarchyRole | undefined = rolesByKey.get(roleKey);

    while (current && !visited.has(current.key)) {
      if (current.key === "team_leader") return true;
      visited.add(current.key);
      current = current.parent_key ? rolesByKey.get(current.parent_key) : undefined;
    }

    return false;
  };

  return agents.filter((agent) => {
    const belongsToPanchayath =
      agent.panchayath_id === panchayathId ||
      agent.responsible_panchayath_ids?.includes(panchayathId) === true;

    return agent.is_active !== false && belongsToPanchayath && isInHierarchy(agent.role);
  });
}