export function getMotivationMessage(matchBand: "HIGH" | "MID" | "LOW"): string {
  if (matchBand === "HIGH") {
    return "You're closer than you think. Focus on refinement and strategic applications.";
  }
  if (matchBand === "MID") {
    return "You have solid foundations. Structured focus will unlock this role.";
  }
  return "This is a growth phase. A strategic pivot today builds long-term success.";
}
