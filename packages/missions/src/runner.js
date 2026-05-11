import { readMissionState, writeMissionState } from "./state.js";
function now() {
    return new Date().toISOString();
}
function hasOpenFindings(state) {
    return state.findings.some((finding) => finding.status === "open");
}
function areDependenciesSatisfied(state, slice) {
    const dependencies = slice.dependsOn ?? [];
    return dependencies.every((dependencyId) => {
        const dependency = state.plan.slices.find((candidate) => candidate.id === dependencyId);
        return dependency?.status === "completed";
    });
}
function nextRunnableSlice(state) {
    return state.plan.slices.find((slice) => slice.status === "planned" && areDependenciesSatisfied(state, slice));
}
function addEvent(state, type, message) {
    state.events.push({ timestamp: now(), type, message });
    state.updatedAt = now();
}
function addHandoff(state, handoff) {
    state.handoffs.push(handoff);
    state.updatedAt = now();
}
function markMissionCompletedIfPossible(state) {
    const allSlicesCompleted = state.plan.slices.every((slice) => slice.status === "completed");
    if (allSlicesCompleted && !hasOpenFindings(state)) {
        state.status = "completed";
        addEvent(state, "mission.completed", `Mission completed for goal: ${state.goal}`);
        return true;
    }
    return false;
}
function createRepairSlices(state, findings, validateSliceId) {
    const existingIds = new Set(state.plan.slices.map((slice) => slice.id));
    const repairIds = [];
    for (const finding of findings) {
        const repairId = `${finding.id}-repair`;
        repairIds.push(repairId);
        if (existingIds.has(repairId))
            continue;
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
function createFollowupValidateSlice(state, runId, repairIds) {
    if (repairIds.length === 0)
        return;
    const followupId = `${runId}-revalidate`;
    if (state.plan.slices.some((slice) => slice.id === followupId))
        return;
    state.plan.slices.push({
        id: followupId,
        title: "Re-validate after repairs",
        kind: "validate",
        status: "planned",
        dependsOn: repairIds,
    });
}
function applyValidatorResultToState(state, slice, result) {
    const materializedFindings = result.findings.map((finding, index) => ({
        ...finding,
        id: finding.id ?? `${result.runId}-finding-${index + 1}`,
        status: "open",
    }));
    if (result.status === "failed") {
        state.findings.push(...materializedFindings);
        const repairIds = createRepairSlices(state, materializedFindings, slice.id);
        createFollowupValidateSlice(state, result.runId, repairIds);
        state.status = repairIds.length > 0 ? "in_progress" : "blocked";
        addEvent(state, "mission.validator_failed", `${result.validator} reported ${materializedFindings.length} finding(s) for ${slice.id}`);
        return;
    }
    state.findings = state.findings.map((finding) => finding.status === "open" ? { ...finding, status: "resolved" } : finding);
    state.status = "in_progress";
    addEvent(state, "mission.validator_passed", `${result.validator} passed for ${slice.id}: ${result.summary}`);
}
export async function runMissionLoop(root, options) {
    const state = readMissionState(root, options.config, options.missionId);
    if (!state) {
        throw new Error(`Mission state not found${options.missionId ? ` for ${options.missionId}` : ""}.`);
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
        addEvent(state, "mission.slice_started", `Starting ${slice.kind} slice ${slice.id}: ${slice.title}`);
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
            addEvent(state, "mission.slice_completed", `Completed validate slice ${slice.id}: ${slice.title}`);
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
            addEvent(state, "mission.slice_failed", `Failed ${slice.kind} slice ${slice.id}: ${result.summary}`);
            writeMissionState(root, state, options.config);
            return { state, iterations, reason: "blocked" };
        }
        slice.status = "completed";
        addEvent(state, "mission.slice_completed", `Completed ${slice.kind} slice ${slice.id}: ${slice.title}`);
        writeMissionState(root, state, options.config);
    }
    writeMissionState(root, state, options.config);
    return { state, iterations, reason: "max_iterations" };
}
