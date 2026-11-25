import { describe, expect, it } from "vitest";
import {
  getEligibleOfficeManagers,
  getEligibleOfficeSecretaries,
  type OfficeAgent,
  type OfficeHierarchyRole,
} from "./virtualOfficeEligibility";

const agents: OfficeAgent[] = [
  {
    id: "coord-local",
    name: "Local Coordinator",
    role: "coordinator",
    panchayath_id: "panchayath-a",
    ward: "1",
    is_active: true,
    responsible_panchayath_ids: null,
  },
  {
    id: "coord-other",
    name: "Other Coordinator",
    role: "coordinator",
    panchayath_id: "panchayath-b",
    ward: "2",
    is_active: true,
    responsible_panchayath_ids: null,
  },
  {
    id: "inactive-coord",
    name: "Inactive Coordinator",
    role: "coordinator",
    panchayath_id: "panchayath-a",
    ward: "3",
    is_active: false,
    responsible_panchayath_ids: null,
  },
  {
    id: "team-leader",
    name: "Team Leader",
    role: "team_leader",
    panchayath_id: "panchayath-b",
    ward: "4",
    is_active: true,
    responsible_panchayath_ids: ["panchayath-a"],
  },
  {
    id: "outside-agent",
    name: "Outside PRO",
    role: "pro",
    panchayath_id: "panchayath-b",
    ward: "5",
    is_active: true,
    responsible_panchayath_ids: null,
  },
  {
    id: "partner",
    name: "Business Partner",
    role: "super_admin_partner",
    panchayath_id: "panchayath-a",
    ward: "6",
    is_active: true,
    responsible_panchayath_ids: null,
  },
];

const roles: OfficeHierarchyRole[] = [
  { key: "team_leader", parent_key: null, is_active: true },
  { key: "coordinator", parent_key: "team_leader", is_active: true },
  { key: "group_leader", parent_key: "coordinator", is_active: true },
  { key: "pro", parent_key: "group_leader", is_active: true },
  { key: "super_admin_partner", parent_key: null, is_active: true },
];

describe("virtual office administrator eligibility", () => {
  it("limits Office Managers to active Coordinators from the selected Panchayath", () => {
    expect(getEligibleOfficeManagers(agents, "panchayath-a").map((agent) => agent.id)).toEqual([
      "coord-local",
    ]);
  });

  it("limits Office Secretaries to active hierarchy agents assigned to the selected Panchayath", () => {
    expect(
      getEligibleOfficeSecretaries(agents, roles, "panchayath-a").map((agent) => agent.id),
    ).toEqual(["coord-local", "team-leader"]);
  });
});