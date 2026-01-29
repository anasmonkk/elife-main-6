import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";

const SUPABASE_URL = "https://qnucqwniloioxsowdqzj.supabase.co";

export type Program = Tables<"programs"> & {
  division?: { name: string; color: string | null };
  panchayath?: { name: string } | null;
  modules?: Tables<"program_modules">[];
  announcements?: Tables<"program_announcements">[];
  advertisements?: Tables<"program_advertisements">[];
  form_questions?: Tables<"program_form_questions">[];
  registration_count?: number;
};

export type ProgramModule = Tables<"program_modules">;
export type ProgramAnnouncement = Tables<"program_announcements">;
export type ProgramAdvertisement = Tables<"program_advertisements">;
export type ProgramFormQuestion = Tables<"program_form_questions">;
export type ProgramRegistration = Tables<"program_registrations">;

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { adminData, isSuperAdmin, user } = useAuth();

  const fetchPrograms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("programs")
        .select(`
          *,
          division:divisions(name, color),
          panchayath:panchayaths(name),
          modules:program_modules(*),
          announcements:program_announcements(*),
          advertisements:program_advertisements(*),
          form_questions:program_form_questions(*)
        `)
        .order("created_at", { ascending: false });

      // Regular admins only see their division's programs
      if (adminData && !isSuperAdmin) {
        query = query.eq("division_id", adminData.division_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Get registration counts
      const programsWithCounts = await Promise.all(
        (data || []).map(async (program) => {
          const { count } = await supabase
            .from("program_registrations")
            .select("*", { count: "exact", head: true })
            .eq("program_id", program.id);

          return { ...program, registration_count: count || 0 };
        })
      );

      setPrograms(programsWithCounts);
    } catch (err: any) {
      setError(err.message || "Failed to fetch programs");
      console.error("Error fetching programs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [adminData, isSuperAdmin]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  return { programs, isLoading, error, refetch: fetchPrograms };
}

export function useProgram(programId: string | undefined) {
  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgram = useCallback(async () => {
    if (!programId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("programs")
        .select(`
          *,
          division:divisions(name, color),
          panchayath:panchayaths(name),
          modules:program_modules(*),
          announcements:program_announcements(*),
          advertisements:program_advertisements(*),
          form_questions:program_form_questions(*)
        `)
        .eq("id", programId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const { count } = await supabase
          .from("program_registrations")
          .select("*", { count: "exact", head: true })
          .eq("program_id", data.id);

        setProgram({ ...data, registration_count: count || 0 });
      } else {
        setProgram(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch program");
      console.error("Error fetching program:", err);
    } finally {
      setIsLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  return { program, isLoading, error, refetch: fetchProgram };
}

export function useProgramRegistrations(programId: string | undefined) {
  const [registrations, setRegistrations] = useState<ProgramRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { adminToken, isSuperAdmin, session } = useAuth();

  // Reset registrations when programId changes to prevent showing stale data
  useEffect(() => {
    setRegistrations([]);
    setError(null);
  }, [programId]);

  const fetchRegistrations = useCallback(async () => {
    if (!programId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // If admin is authenticated via custom token, use edge function
      if (adminToken) {
        const functionUrl = `${SUPABASE_URL}/functions/v1/admin-registrations?program_id=${programId}`;
        const fetchResponse = await fetch(functionUrl, {
          method: "GET",
          headers: {
            "x-admin-token": adminToken,
            "Content-Type": "application/json",
          },
        });

        if (!fetchResponse.ok) {
          const errorData = await fetchResponse.json();
          throw new Error(errorData.error || "Failed to fetch registrations");
        }

        const data = await fetchResponse.json();
        setRegistrations(data.registrations || []);
      } else {
        // Super admin or authenticated user - use direct Supabase query
        const { data, error: fetchError } = await supabase
          .from("program_registrations")
          .select("*")
          .eq("program_id", programId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setRegistrations(data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch registrations");
      console.error("Error fetching registrations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [programId, adminToken, isSuperAdmin, session]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  return { registrations, isLoading, error, refetch: fetchRegistrations };
}
