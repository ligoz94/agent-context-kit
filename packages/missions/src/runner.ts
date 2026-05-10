import { MissionConfig, readMissionState, writeMissionState } from "./state.js";
import {
  MissionFinding,
  MissionHandoff,
  MissionHandoffCommand,
  MissionSlice,
  MissionState,
  ValidationAssertion,
  ValidatorResult,
} from "./schemas.js";

export interface MissionWorkerContext {
  mission: MissionState;
  slice: MissionSlice;
  iteration: number;
}

export interface MissionWorkerResult {
  status: "completed" | "failed";
  summary: string;
  filesTouched?: string[];
  commands?: MissionHandoffCommand[];
  issues?: string[];
  nextSuggestedAction?: string;
}

export interface MissionValidatorContext {
  mission: MissionState;
  slice: MissionSlice;
  iteration: number;
  assertions: ValidationAssertion[];
}

export interface MissionLoopOptions {
  missionId?: string;
  config?: MissionConfig;
  maxIterations?: number;
  worker: (context: MissionWorkerContext) => Promise<MissionWorkerResult> | MissionWorkerResult;
  validator: (context: MissionValidatorContext) => Promise<ValidatorResult> | ValidatorResult;
}

export interface MissionLoopResult {
  state: MissionState;
  iterations: number;
  reason: "completed" | "blocked" | "max_iterations" | "no_runnable_slice";
}

function now(): string {
  return new Date().toISOString();
}

function hasOpenFindings(state: MissionState): boolean {
  return state.findings.some((finding) => finding.status === "open");
}

function areDependenciesSatisfied(state: MissionState, slice: MissionSlice): boolean {
  const dependencies = slice.dependsOn ?? [];
  return dependencies.every((dependencyId) => {
    const dependency = state.plan.slices.find((candidate) => candidate.id === dependencyId);
    return dependency?.status === "completed";
  });
}

function nextRunnableSlice(state: MissionState): MissionSlice | undefined {
  return state.plan.slices.find(
    (slice) => slice.status === "planned" && areDependenciesSatisfied(state, slice),
  );
}

function addEvent(state: MissionState, type: string, message: string): void {
  state.events.push({ timestamp: now(), type, message });
  state.updatedAt = now();
}

function addHandoff(state: MissionState, handoff: MissionHandoff): void {
  state.handoffs.push(handoff);
  state.updatedAt = now();
}

function markMissionCompletedIfPossible(state: MissionState): boolean {
  const allSlicesCompleted = state.plan.slices.every((slice) => slice.status === "completed");
  if (allSlicesCompleted && !hasOpenFindings(state)) {
    state.status = "completed";
    addEvent(state, "mission.completed", `Mission completed for goal: ${state.goal}`);
    return true;
  }

  return false;
}

function createRepairSlices(
  state: MissionState,
  findings: MissionFinding[],
  validateSliceId: string,
): string[] {
  const existingIds = new Set(state.plan.slices.map((slice) => slice.id));
  const repairIds: string[] = [];

  for (const finding of findings) {
    const repairId = `${finding.id}-repair`;
    repairIds.push(repairId);
    if (existingIds.has(repairId)) continue;

    state.plan.slices.push({
      id: repairId,
      title: `Repair: ${finding.summary}`,
      kind: "repair",
      status: "planned",
      summary: finding.details,
      dependsOn: finding.relatedSliceId ? [finding.relatedSliceId] : [validateSliceId],
    });
    existingIds.add(repairId);
  }

  return repairIds;
}

function createFollowupValidateSlice(
  state: MissionState,
  runId: string,
  repairIds: string[],
): void {
  if (repairIds.length === 0) return;

  const followupId = `${runId}-revalidate`;
  if (state.plan.slices.some((slice) => slice.id === followupId)) return;

  state.plan.slices.push({
    id: followupId,
    title: "Re-validate after repairs",
    kind: "validate",
    status: "planned",
    dependsOn: repairIds,
  });
}

function applyValidatorResultToState(
  state: MissionState,
  slice: MissionSlice,
  result: ValidatorResult,
): void {
  const materializedFindings = result.findings.map((finding, index) => ({
    ...finding,
    id: finding.id ?? `${result.runId}-finding-${index + 1}`,
    status: "open" as const,
  }));

  if (result.status === "failed") {
    state.findings.push(...materializedFindings);
    const repairIds = createRepairSlices(state, materializedFindings, slice.id);
    createFollowupValidateSlice(state, result.runId, repairIds);
    state.status = repairIds.length > 0 ? "in_progress" : "blocked";
    addEvent(
      state,
      "mission.validator_failed",
      `${result.validator} reported ${materializedFindings.length} finding(s) for ${slice.id}`,
    );
    return;
  }

  state.findings = state.findings.map((finding) =>
    finding.status === "open" ? { ...finding, status: "resolved" as const } : finding,
  );
  state.status = "in_progress";
  addEvent(
    state,
    "mission.validator_passed",
    `${result.validator} passed for ${slice.id}: ${result.summary}`,
  );
}

export async function runMissionLoop(
  root: string,
  options: MissionLoopOptions,
): Promise<MissionLoopResult> {
  const state = readMissionState(root, options.config, options.missionId);
  if (!state) {
    throw new Error(
      `Mission state not found${options.missionId ? ` for ${options.missionId}` : ""}.`,
    );
  }

  const maxIterations = options.maxIterations ?? 20;
  let iterations = 0;

  while (iterations < maxIterations) {
    if (markMissionCompletedIfPossible(state)) {
      writeMissionState(root, state, options.config);
      return { state, iterations, reason: "completed" };
    }

    const slice = nextRunnableSlice(state);
    if (!slice) {
      state.status = hasOpenFindings(state) ? "blocked" : state.status;
      writeMissionState(root, state, options.config);
      return {
        state,
        iterations,
        reason: hasOpenFindings(state) ? "blocked" : "no_runnable_slice",
      };
    }

    iterations += 1;
    slice.status = "in_progress";
    state.status = "in_progress";
    addEvent(
      state,
      "mission.slice_started",
      `Starting ${slice.kind} slice ${slice.id}: ${slice.title}`,
    );

    if (slice.kind === "validate") {
      const result = await options.validator({
        mission: state,
        slice,
        iteration: iterations,
        assertions: state.validationContract,
      });
      slice.status = "completed";
      addHandoff(state, {
        runId: result.runId,
        role: "validator",
        status: result.status === "passed" ? "completed" : "completed_with_findings",
        summary: result.summary,
        issues: result.findings.map((finding) => finding.summary),
      });
      addEvent(
        state,
        "mission.slice_completed",
        `Completed validate slice ${slice.id}: ${slice.title}`,
      );
      applyValidatorResultToState(state, slice, result);
      writeMissionState(root, state, options.config);
      continue;
    }

    const result = await options.worker({ mission: state, slice, iteration: iterations });
    addHandoff(state, {
      runId: `${state.id}-worker-${iterations}`,
      role: "worker",
      status: result.status === "completed" ? "completed" : "failed",
      summary: result.summary,
      filesTouched: result.filesTouched,
      commands: result.commands,
      issues: result.issues,
      nextSuggestedAction: result.nextSuggestedAction,
    });

    if (result.status === "failed") {
      slice.status = "blocked";
      state.status = "blocked";
      addEvent(
        state,
        "mission.slice_failed",
        `Failed ${slice.kind} slice ${slice.id}: ${result.summary}`,
      );
      writeMissionState(root, state, options.config);
      return { state, iterations, reason: "blocked" };
    }

    slice.status = "completed";
    addEvent(
      state,
      "mission.slice_completed",
      `Completed ${slice.kind} slice ${slice.id}: ${slice.title}`,
    );
    writeMissionState(root, state, options.config);
  }

  writeMissionState(root, state, options.config);
  return { state, iterations, reason: "max_iterations" };
}
