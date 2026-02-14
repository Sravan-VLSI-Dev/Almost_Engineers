import { matchStrategySchema, type MatchStrategyResponse } from "@/schemas/matchStrategySchema";

export function validateMatchStrategyPayload(payload: unknown): MatchStrategyResponse {
  return matchStrategySchema.parse(payload);
}
