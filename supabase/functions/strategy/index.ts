import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
import { buildMatchStrategy } from "./services/matchStrategyService.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const bodySchema = z.object({
  profileId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
});

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRole);
}

async function getUserId(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("Not authenticated");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

function idsFromPath(req: Request) {
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 5 && parts[2] === "strategy") {
    return { profileId: parts[3], roleId: parts[4] };
  }
  return { profileId: undefined, roleId: undefined };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") throw new Error("Method not allowed");

    const pathIds = idsFromPath(req);
    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.parse(body || {});

    const profileId = pathIds.profileId || parsed.profileId;
    const roleId = pathIds.roleId || parsed.roleId;
    if (!profileId || !roleId) throw new Error("profileId and roleId are required");

    const userId = await getUserId(req);
    const supabase = getServiceClient();
    const result = await buildMatchStrategy({ supabase, profileId, roleId, userId });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("Not authenticated")
      ? 401
      : message.includes("required") || message.includes("Method")
        ? 400
        : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
