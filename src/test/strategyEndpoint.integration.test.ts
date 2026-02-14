import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchMatchStrategy } from "@/services/matchStrategyService";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          match_band: "MID",
          strategy: {
            prioritized_roadmap: ["TypeScript", "System Design"],
            learning_timeline: [{ week: 1, primary_focus: "TypeScript", outcome: "Ship one artifact" }],
          },
          psychological_layer: {
            motivation_message: "You have solid foundations. Structured focus will unlock this role.",
            identity_alignment_insight: "Your strengths indicate structured problem solving and long-term systems orientation.",
            industry_expectation_range: "4-6 months",
          },
          source_metrics: {
            role_match_percentage: 58,
            projection_match_percentage: 78,
            roadmap_hours: 64,
          },
        },
        error: null,
      }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "token-123" } },
        error: null,
      }),
    },
  },
}));

describe("strategy endpoint integration", () => {
  beforeEach(() => {
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls /strategy/:profileId/:roleId and returns validated payload", async () => {
    const response = await fetchMatchStrategy("profile-abc", "role-xyz");
    expect(response.match_band).toBe("MID");
    expect(response.strategy.prioritized_roadmap).toBeDefined();
    expect(response.psychological_layer?.motivation_message).toBeTruthy();
  });
});
