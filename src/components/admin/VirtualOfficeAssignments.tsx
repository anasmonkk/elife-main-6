import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, MapPin, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  getEligibleOfficeManagers,
  getEligibleOfficeSecretaries,
  type OfficeAgent,
  type OfficeHierarchyRole,
} from "@/lib/virtualOfficeEligibility";

type PanchayathOption = { id: string; name: string; district: string | null };
type OfficeAssignment = {
  panchayath_id: string;
  office_manager_agent_id: string | null;
  office_secretary_agent_id: string | null;
};

export function VirtualOfficeAssignments() {
  const [panchayaths, setPanchayaths] = useState<PanchayathOption[]>([]);
  const [agents, setAgents] = useState<OfficeAgent[]>([]);
  const [roles, setRoles] = useState<OfficeHierarchyRole[]>([]);
  const [assignments, setAssignments] = useState<OfficeAssignment[]>([]);
  const [selectedPanchayathId, setSelectedPanchayathId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [secretaryId, setSecretaryId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      const [panchayathResult, agentResult, roleResult, assignmentResult] = await Promise.all([
        supabase
          .from("panchayaths")
          .select("id, name, district")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("pennyekart_agents")
          .select("id, name, role, panchayath_id, ward, is_active, responsible_panchayath_ids")
          .order("name"),
        supabase.from("pennyekart_agent_roles").select("key, parent_key, is_active"),
        supabase
          .from("panchayath_virtual_offices")
          .select("panchayath_id, office_manager_agent_id, office_secretary_agent_id"),
      ]);

      const firstError =
        panchayathResult.error || agentResult.error || roleResult.error || assignmentResult.error;
      if (firstError) {
        setErrorMessage(firstError.message);
        setIsLoading(false);
        return;
      }

      const nextPanchayaths = panchayathResult.data || [];
      setPanchayaths(nextPanchayaths);
      setAgents((agentResult.data || []) as OfficeAgent[]);
      setRoles((roleResult.data || []) as OfficeHierarchyRole[]);
      setAssignments((assignmentResult.data || []) as OfficeAssignment[]);
      setSelectedPanchayathId((current) => current || nextPanchayaths[0]?.id || "");
      setIsLoading(false);
    };

    void load();
  }, []);

  const selectedAssignment = assignments.find(
    (assignment) => assignment.panchayath_id === selectedPanchayathId,
  );

  useEffect(() => {
    setManagerId(selectedAssignment?.office_manager_agent_id || "");
    setSecretaryId(selectedAssignment?.office_secretary_agent_id || "");
  }, [selectedPanchayathId, selectedAssignment?.office_manager_agent_id, selectedAssignment?.office_secretary_agent_id]);

  const eligibleManagers = useMemo(
    () => getEligibleOfficeManagers(agents, selectedPanchayathId),
    [agents, selectedPanchayathId],
  );
  const eligibleSecretaries = useMemo(
    () => getEligibleOfficeSecretaries(agents, roles, selectedPanchayathId),
    [agents, roles, selectedPanchayathId],
  );

  const saveAssignment = async () => {
    if (!selectedPanchayathId) return;
    setIsSaving(true);
    setErrorMessage("");

    const result = managerId || secretaryId
      ? await supabase.from("panchayath_virtual_offices").upsert(
          {
            panchayath_id: selectedPanchayathId,
            office_manager_agent_id: managerId || null,
            office_secretary_agent_id: secretaryId || null,
            assigned_by: user?.id || null,
          },
          { onConflict: "panchayath_id" },
        )
      : await supabase
          .from("panchayath_virtual_offices")
          .delete()
          .eq("panchayath_id", selectedPanchayathId);

    setIsSaving(false);
    if (result.error) {
      setErrorMessage(result.error.message);
      toast({ title: "Could not save office administrators", description: result.error.message, variant: "destructive" });
      return;
    }

    setAssignments((current) => {
      const withoutCurrent = current.filter((assignment) => assignment.panchayath_id !== selectedPanchayathId);
      return managerId || secretaryId
        ? [...withoutCurrent, {
            panchayath_id: selectedPanchayathId,
            office_manager_agent_id: managerId || null,
            office_secretary_agent_id: secretaryId || null,
          }]
        : withoutCurrent;
    });
    toast({ title: "Virtual Office updated", description: "The public Panchayath office page will show these assignments." });
  };

  const selectedPanchayath = panchayaths.find((panchayath) => panchayath.id === selectedPanchayathId);

  if (isLoading) {
    return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <section className="space-y-6" aria-labelledby="virtual-office-admin-title">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-primary">Panchayath leadership</p>
        <h2 id="virtual-office-admin-title" className="mt-1 text-2xl font-semibold">Virtual Office administrators</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose an Office Manager from the selected Panchayath’s Coordinators and an Office Secretary from its active hierarchy.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {panchayaths.length === 0 ? (
        <Alert><AlertDescription>No active Panchayaths are available.</AlertDescription></Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)]">
          <div className="space-y-2">
            <Label htmlFor="office-panchayath">Panchayath</Label>
            <Select value={selectedPanchayathId} onValueChange={setSelectedPanchayathId}>
              <SelectTrigger id="office-panchayath" aria-label="Select Panchayath">
                <SelectValue placeholder="Choose a Panchayath" />
              </SelectTrigger>
              <SelectContent>
                {panchayaths.map((panchayath) => (
                  <SelectItem key={panchayath.id} value={panchayath.id}>
                    {panchayath.name}{panchayath.district ? ` · ${panchayath.district}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedPanchayath ? `${selectedPanchayath.name} Virtual Office` : "Select a Panchayath"}
            </p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" /> Office Manager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="office-manager">Coordinator from this Panchayath</Label>
                <Select value={managerId || "none"} onValueChange={(value) => setManagerId(value === "none" ? "" : value)}>
                  <SelectTrigger id="office-manager" aria-label="Choose Office Manager">
                    <SelectValue placeholder="Not assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {eligibleManagers.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.name} · Ward {agent.ward}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {eligibleManagers.length === 0 && <p className="text-xs text-muted-foreground">No active Coordinators are assigned here.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" /> Office Secretary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="office-secretary">Active member of this Panchayath hierarchy</Label>
                <Select value={secretaryId || "none"} onValueChange={(value) => setSecretaryId(value === "none" ? "" : value)}>
                  <SelectTrigger id="office-secretary" aria-label="Choose Office Secretary">
                    <SelectValue placeholder="Not assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not assigned</SelectItem>
                    {eligibleSecretaries.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} · {roles.find((role) => role.key === agent.role)?.key.replaceAll("_", " ") || agent.role} · Ward {agent.ward}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {eligibleSecretaries.length === 0 && <p className="text-xs text-muted-foreground">No active hierarchy members are assigned here.</p>}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveAssignment} disabled={isSaving || !selectedPanchayathId}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save administrators
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}