export function getIndustryExpectation(roleName: string): string {
  const role = roleName.toLowerCase();
  if (role.includes("frontend")) return "3-5 months";
  if (role.includes("backend")) return "4-6 months";
  if (role.includes("ml") || role.includes("machine learning")) return "6-9 months";
  if (role.includes("vlsi") || role.includes("verification") || role.includes("rtl")) return "6-12 months";
  if (role.includes("devops") || role.includes("infra")) return "4-7 months";
  return "4-8 months";
}
