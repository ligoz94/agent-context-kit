import { describe, it, expect } from "vitest";
import { createMissionPlan } from "./planner.js";

describe("@agent-context-kit/missions/planner", () => {
  it("creates slices from issue bullet points", () => {
    const output = createMissionPlan({
      goal: "Implement planner",
      issue: {
        number: 42,
        title: "Implement planner",
        body: "- Add slice planning\n- Add validation assertions\n- Add status output",
      },
    });

    expect(output.plan.slices).toHaveLength(3);
    expect(output.plan.summary).toContain("#42");
    expect(output.validationContract.length).toBeGreaterThan(0);
  });

  it("falls back to default slices when no task lines are present", () => {
    const output = createMissionPlan({ goal: "Ship mission runtime" });
    expect(output.plan.slices).toHaveLength(3);
    expect(output.plan.slices[0].kind).toBe("plan");
  });
});