import { describe, expect, it } from "vitest";
import { getIndustryExpectation } from "@/domain/expectationEngine";

describe("getIndustryExpectation", () => {
  it("maps frontend roles", () => {
    expect(getIndustryExpectation("Frontend Engineer")).toBe("3-5 months");
  });

  it("maps backend roles", () => {
    expect(getIndustryExpectation("Backend Engineer")).toBe("4-6 months");
  });

  it("maps ML roles", () => {
    expect(getIndustryExpectation("ML Engineer")).toBe("6-9 months");
  });

  it("maps VLSI roles", () => {
    expect(getIndustryExpectation("VLSI Engineer")).toBe("6-12 months");
  });
});
