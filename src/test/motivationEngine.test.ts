import { describe, expect, it } from "vitest";
import { getMotivationMessage } from "@/domain/motivationEngine";

describe("getMotivationMessage", () => {
  it("returns deterministic HIGH message", () => {
    expect(getMotivationMessage("HIGH")).toBe("You're closer than you think. Focus on refinement and strategic applications.");
  });

  it("returns deterministic MID message", () => {
    expect(getMotivationMessage("MID")).toBe("You have solid foundations. Structured focus will unlock this role.");
  });

  it("returns deterministic LOW message", () => {
    expect(getMotivationMessage("LOW")).toBe("This is a growth phase. A strategic pivot today builds long-term success.");
  });
});
