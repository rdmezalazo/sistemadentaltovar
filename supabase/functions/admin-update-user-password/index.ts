import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  user_id: string;
  new_password: string;
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing backend credentials");
      return json({ error: "Backend no configurado" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    const callerClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      console.warn("Unauthorized call", callerError?.message);
      return json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: isAdmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Role check failed", roleError);
      return json({ error: "No se pudo validar permisos" }, { status: 500 });
    }

    if (!isAdmin) {
      return json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;

    const user_id = body?.user_id?.trim();
    const new_password = body?.new_password;

    if (!user_id || typeof new_password !== "string") {
      return json(
        { error: "Parámetros inválidos: user_id y new_password son requeridos" },
        { status: 400 },
      );
    }

    if (new_password.length < 6) {
      return json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      console.error("Password update failed", { user_id, error: updateError });
      return json(
        { error: updateError.message || "No se pudo actualizar la contraseña" },
        { status: 400 },
      );
    }

    console.log("Password updated by admin", {
      admin_user_id: caller.id,
      target_user_id: user_id,
      at: new Date().toISOString(),
    });

    return json({ ok: true });
  } catch (error) {
    console.error("Error in admin-update-user-password function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, { status: 500 });
  }
});
