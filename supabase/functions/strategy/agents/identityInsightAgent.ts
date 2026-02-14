import { z } from "https://esm.sh/zod@3.25.76";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_TOKENS = 220;
const MAX_RETRIES = 2;

const identityInsightSchema = z.object({
  identity_insight: z.string().min(1).max(600),
});

export async function buildIdentityInsight(input: {
  dominant_traits: string[];
  suggested_long_term_direction: string;
}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return {
      identity_insight: `Your recent strengths suggest ${input.dominant_traits.join(" and ")} tendencies. ${input.suggested_long_term_direction}`,
    };
  }

  const tools = [{
    type: "function",
    function: {
      name: "identity_insight",
      description: "Return identity alignment insight in JSON.",
      parameters: {
        type: "object",
        properties: {
          identity_insight: { type: "string" },
        },
        required: ["identity_insight"],
        additionalProperties: false,
      },
    },
  }];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          temperature: 0.2,
          max_tokens: MAX_TOKENS,
          messages: [
            {
              role: "system",
              content: "You are a career psychologist assistant. Write 2-3 analytical and respectful sentences. Do not force predictions. Return JSON only.",
            },
            {
              role: "user",
              content: JSON.stringify(input),
            },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "identity_insight" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error ${response.status}`);
      const json = await response.json();
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = identityInsightSchema.parse(JSON.parse(typeof args === "string" ? args : "{}"));
      return parsed;
    } catch {
      if (attempt === MAX_RETRIES) {
        return {
          identity_insight: `Your recent strengths suggest ${input.dominant_traits.join(" and ")} tendencies. ${input.suggested_long_term_direction}`,
        };
      }
    }
  }

  return {
    identity_insight: `Your recent strengths suggest ${input.dominant_traits.join(" and ")} tendencies. ${input.suggested_long_term_direction}`,
  };
}
