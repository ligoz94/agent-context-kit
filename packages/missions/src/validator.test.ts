import { describe, it, expect } from "vitest";
import { createValidatorResult } from "./validator.js";

describe("@agent-context-kit/missions/validator", () => {
  it("returns passed when no failed checks are supplied", () => {
    const result = createValidatorResult({
      validator: "scrutiny",
      runId: "val-1",
      summary: "All checks passed",
    });

    expect(result.status).toBe("passed");
    expect(result.findings).toHaveLength(0);
  });

  it("creates findings when failed checks are supplied", () => {
    const result = createValidatorResult({
      validator: "behavioral",
      runId: "val-2",
      summary: "UI regression detected",
      failedChecks: ["Submit button does not render"],
      relatedSliceId: "slice-2",
    });

    expect(result.status).toBe("failed");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].relatedSliceId).toBe("slice-2");
  });
});