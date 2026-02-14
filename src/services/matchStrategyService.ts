import { supabase } from "@/integrations/supabase/client";
import { validateMatchStrategyPayload } from "@/agents/matchStrategyAgent";
import type { MatchStrategyResponse } from "@/schemas/matchStrategySchema";

export async function fetchMatchStrategy(profileId: string, roleId: string): Promise<MatchStrategyResponse> {
  const invokeResult = await supabase.functions.invoke("strategy", {
    body: { profileId, roleId },
  });

  if (!invokeResult.error) {
    return validateMatchStrategyPayload(invokeResult.data);
  }

  // Fallback: direct request can succeed when invoke transport fails in some environments.
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Strategy service unavailable and no active session token.");

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/strategy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profileId, roleId }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const edgeMessage = typeof json?.error === "string" ? json.error : "";
    throw new Error(edgeMessage || invokeResult.error.message || "Failed to send a request to the Edge Function");
  }

  return validateMatchStrategyPayload(json);
}
