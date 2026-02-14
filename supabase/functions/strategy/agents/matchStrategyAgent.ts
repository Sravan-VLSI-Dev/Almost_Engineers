import { z } from "https://esm.sh/zod@3.25.76";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_TOKENS = 900;
const MAX_RETRIES = 2;

const refinedStrategySchema = z.object({
  narrative: z.string().min(1).max(2000),
  recommendations: z.array(z.string().min(1)).max(12).default([]),
});

export type RefinedStrategy = z.infer<typeof refinedStrategySchema>;

export async function refineStrategyNarrative(input: {
  match_band: "HIGH" | "MID" | "LOW";
  title: string;
  deterministic_summary: string;
  deterministic_points: string[];
}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return {
      narrative: input.deterministic_summary,
      recommendations: input.deterministic_points,
    };
  }

  const tools = [{
    type: "function",
    function: {
      name: "refined_strategy",
      description: "Return refined strategy language in JSON.",
      parameters: {
        type: "object",
        properties: {
          narrative: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } },
        },
        required: ["narrative", "recommendations"],
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
              content: "You are a career strategist. Refine language only. Do not change deterministic facts. Return JSON only.",
            },
            {
              role: "user",
              content: JSON.stringify(input),
            },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "refined_strategy" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error ${response.status}`);
      const json = await response.json();
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = refinedStrategySchema.parse(JSON.parse(typeof args === "string" ? args : "{}"));
      return parsed;
    } catch {
      if (attempt === MAX_RETRIES) {
        return {
          narrative: input.deterministic_summary,
          recommendations: input.deterministic_points,
        };
      }
    }
  }

  return {
    narrative: input.deterministic_summary,
    recommendations: input.deterministic_points,
  };
}
