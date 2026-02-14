import { describe, expect, it } from "vitest";
import { getMatchBand } from "@/domain/matchStrategyEngine";

describe("getMatchBand", () => {
  it("returns HIGH for > 75", () => {
    expect(getMatchBand(76)).toBe("HIGH");
    expect(getMatchBand(100)).toBe("HIGH");
  });

  it("returns MID for 40-75 inclusive", () => {
    expect(getMatchBand(40)).toBe("MID");
    expect(getMatchBand(75)).toBe("MID");
    expect(getMatchBand(55.5)).toBe("MID");
  });

  it("returns LOW for < 40", () => {
    expect(getMatchBand(39.9)).toBe("LOW");
    expect(getMatchBand(0)).toBe("LOW");
  });
});
