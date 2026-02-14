export function clusterIdentity(skills: string[]) {
  const normalized = skills.map((s) => s.toLowerCase());
  const buckets = {
    analytical_system_oriented: ["system design", "architecture", "vlsi", "rtl", "verilog", "gate level", "sva"],
    creative_builder: ["frontend", "ui", "ux", "design", "react", "css"],
    research_driven: ["ml", "machine learning", "data", "statistics", "pytorch", "tensorflow"],
    structured_problem_solver: ["backend", "infra", "infrastructure", "api", "distributed", "kubernetes", "docker"],
  } as const;

  const scores: Record<string, number> = {
    analytical_system_oriented: 0,
    creative_builder: 0,
    research_driven: 0,
    structured_problem_solver: 0,
  };

  for (const skill of normalized) {
    for (const [bucket, keywords] of Object.entries(buckets)) {
      if (keywords.some((k) => skill.includes(k))) scores[bucket] += 1;
    }
  }

  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .map(([bucket]) => bucket);

  const dominant_traits = ranked.length > 0 ? ranked.slice(0, 2) : ["structured_problem_solver"];
  const suggested_long_term_direction = dominant_traits[0] === "analytical_system_oriented"
    ? "Roles emphasizing system design, architecture depth, and verification rigor."
    : dominant_traits[0] === "creative_builder"
      ? "Roles that combine product thinking with hands-on feature building."
      : dominant_traits[0] === "research_driven"
        ? "Roles with experimentation, model iteration, and evidence-based optimization."
        : "Roles focused on scalable systems, reliability, and structured delivery.";

  return { dominant_traits, suggested_long_term_direction };
}
