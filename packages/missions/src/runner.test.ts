import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMissionPlan } from "./planner.js";
import { runMissionLoop } from "./runner.js";
import { createMissionState, readMissionState } from "./state.js";
import { createValidatorResult } from "./validator.js";

describe("@agent-context-kit/missions/runner", () => {
  const roots: string[] = [];

  afterEach(() => {
    while (roots.length > 0) {
      const root = roots.pop();
      if (root) rmSync(root, { recursive: true, force: true });
    }
  });

  function createTempMission(goal: string) {
    const root = mkdtempSync(join(tmpdir(), "ack-mission-"));
    roots.push(root);
    const planOutput = createMissionPlan({ goal });
    const state = createMissionState(root, goal, undefined, "mission-1", planOutput.plan);
    state.validationContract = planOutput.validationContract;
    return { root, state };
  }

  it("runs the default plan to completion", async () => {
    const { root } = createTempMission("Ship mission runtime");
    const worker = vi.fn().mockReturnValue({ status: "completed", summary: "done" });
    const validator = vi.fn().mockImplementation(({ slice }) =>
      createValidatorResult({
        runId: `${slice.id}-validator`,
        validator: "scrutiny",
        summary: "all checks green",
      }),
    );

    const result = await runMissionLoop(root, {
      missionId: "mission-1",
      worker,
      validator,
    });

    expect(result.reason).toBe("completed");
    expect(result.state.status).toBe("completed");
    expect(result.state.plan.slices.every((slice) => slice.status === "completed")).toBe(true);
    expect(worker).toHaveBeenCalledTimes(2);
    expect(validator).toHaveBeenCalledTimes(1);
  });

  it("creates repair and revalidate slices after validator findings", async () => {
    const { root } = createTempMission("Ship mission runtime");
    const worker = vi.fn().mockReturnValue({ status: "completed", summary: "done" });
    const validator = vi
      .fn()
      .mockImplementationOnce(({ slice }) =>
        createValidatorResult({
          runId: `${slice.id}-validator-1`,
          validator: "review",
          summary: "review found a bug",
          failedChecks: ["Fix missing retry logic"],
          relatedSliceId: "slice-2-implement",
        }),
      )
      .mockImplementationOnce(({ slice }) =>
        createValidatorResult({
          runId: `${slice.id}-validator-2`,
          validator: "review",
          summary: "review passed",
        }),
      );

    const result = await runMissionLoop(root, {
      missionId: "mission-1",
      worker,
      validator,
      maxIterations: 10,
    });

    const persisted = readMissionState(root, undefined, "mission-1");
    expect(result.reason).toBe("completed");
    expect(persisted?.status).toBe("completed");
    expect(persisted?.findings.every((finding) => finding.status === "resolved")).toBe(true);
    expect(persisted?.plan.slices.some((slice) => slice.kind === "repair")).toBe(true);
    expect(
      persisted?.plan.slices.some(
        (slice) => slice.kind === "validate" && slice.id.endsWith("revalidate"),
      ),
    ).toBe(true);
    expect(validator).toHaveBeenCalledTimes(2);
  });
});
