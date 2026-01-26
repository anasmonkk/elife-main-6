import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

interface AdminTokenPayload {
  admin_id: string;
  user_id: string;
  division_id: string;
  exp: number;
}

async function verifyAdminToken(
  token: string,
  serviceKey: string,
): Promise<AdminTokenPayload | null> {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    const tokenData = atob(payloadBase64);
    const payload: AdminTokenPayload = JSON.parse(tokenData);

    // Check expiry
    if (payload.exp < Date.now()) {
      console.log("Token expired");
      return null;
    }

    // Verify signature
    const tokenEncoder = new TextEncoder();
    const tokenBuffer = tokenEncoder.encode(tokenData + serviceKey);
    const signatureBuffer = await crypto.subtle.digest("SHA-256", tokenBuffer);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = signatureArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== expectedSignature) {
      console.log("Invalid signature");
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken) {
      return new Response(JSON.stringify({ error: "Admin token required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminPayload = await verifyAdminToken(adminToken, supabaseServiceKey);
    if (!adminPayload) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin is still active
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("id, is_active, division_id")
      .eq("id", adminPayload.admin_id)
      .single();

    if (adminError || !admin || !admin.is_active) {
      return new Response(
        JSON.stringify({ error: "Admin account not found or inactive" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const { action, data } = body as {
      action?: string;
      data?: Record<string, unknown>;
    };

    if (!action) {
      return new Response(JSON.stringify({ error: "Action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const divisionId = admin.division_id as string;

    async function verifyProgramAccess(programId: string): Promise<boolean> {
      const { data: program, error } = await supabase
        .from("programs")
        .select("division_id")
        .eq("id", programId)
        .single();

      if (error || !program) return false;
      return program.division_id === divisionId;
    }

    switch (action) {
      case "list": {
        const programId = String(data?.program_id || "");
        if (!programId) {
          return new Response(
            JSON.stringify({ error: "program_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (!(await verifyProgramAccess(programId))) {
          return new Response(
            JSON.stringify({
              error: "You can only manage questions for programs in your division",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { data: questions, error } = await supabase
          .from("program_form_questions")
          .select("*")
          .eq("program_id", programId)
          .order("sort_order", { ascending: true });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, questions }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create": {
        const programId = String(data?.program_id || "");
        if (!programId) {
          return new Response(
            JSON.stringify({ error: "program_id is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (!(await verifyProgramAccess(programId))) {
          return new Response(
            JSON.stringify({
              error: "You can only manage questions for programs in your division",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const insertPayload = {
          program_id: programId,
          question_text: String(data?.question_text || "").trim(),
          question_type: String(data?.question_type || "text"),
          is_required: Boolean(data?.is_required || false),
          options: (data?.options ?? null) as unknown,
          sort_order: Number(data?.sort_order ?? 0),
        };

        if (!insertPayload.question_text) {
          return new Response(
            JSON.stringify({ error: "question_text is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { data: question, error } = await supabase
          .from("program_form_questions")
          .insert(insertPayload)
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, question }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        const questionId = String(data?.id || "");
        if (!questionId) {
          return new Response(JSON.stringify({ error: "id is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: existing, error: fetchError } = await supabase
          .from("program_form_questions")
          .select("id, program_id")
          .eq("id", questionId)
          .single();

        if (fetchError || !existing) {
          return new Response(JSON.stringify({ error: "Question not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!(await verifyProgramAccess(existing.program_id))) {
          return new Response(
            JSON.stringify({
              error: "You can only manage questions for programs in your division",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const updatePayload: Record<string, unknown> = {};
        if (data?.question_text !== undefined)
          updatePayload.question_text = String(data.question_text).trim();
        if (data?.question_type !== undefined)
          updatePayload.question_type = String(data.question_type);
        if (data?.is_required !== undefined)
          updatePayload.is_required = Boolean(data.is_required);
        if (data?.options !== undefined) updatePayload.options = data.options;
        if (data?.sort_order !== undefined)
          updatePayload.sort_order = Number(data.sort_order);

        const { data: question, error } = await supabase
          .from("program_form_questions")
          .update(updatePayload)
          .eq("id", questionId)
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, question }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        const questionId = String(data?.id || "");
        if (!questionId) {
          return new Response(JSON.stringify({ error: "id is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: existing, error: fetchError } = await supabase
          .from("program_form_questions")
          .select("id, program_id")
          .eq("id", questionId)
          .single();

        if (fetchError || !existing) {
          return new Response(JSON.stringify({ error: "Question not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!(await verifyProgramAccess(existing.program_id))) {
          return new Response(
            JSON.stringify({
              error: "You can only manage questions for programs in your division",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const { error } = await supabase
          .from("program_form_questions")
          .delete()
          .eq("id", questionId);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in admin-form-questions:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
