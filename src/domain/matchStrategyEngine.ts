export type MatchBand = "HIGH" | "MID" | "LOW";

export function getMatchBand(roleMatch: number): MatchBand {
  if (roleMatch > 75) return "HIGH";
  if (roleMatch >= 40) return "MID";
  return "LOW";
}
