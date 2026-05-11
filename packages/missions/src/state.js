import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { MissionStateSchema, } from "./schemas.js";
export function resolveMissionStateDir(root, config) {
    return resolve(root, config?.stateDir ?? ".agent-context-kit/missions");
}
export function generateMissionId(goal) {
    const slug = goal
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "mission";
    return `${slug}-${Date.now()}`;
}
export function writeMissionState(root, state, config) {
    const dir = resolveMissionStateDir(root, config);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${state.id}.json`), JSON.stringify(state, null, 2), "utf8");
}
export function createMissionState(root, goal, config, missionId, plan, sourceIssue) {
    const now = new Date().toISOString();
    const state = {
        id: missionId ?? generateMissionId(goal),
        goal,
        status: "planned",
        createdAt: now,
        updatedAt: now,
        sourceIssue,
        plan: plan ?? { summary: `Mission plan for ${goal}`, slices: [] },
        validationContract: config?.defaultAssertions ?? [],
        handoffs: [],
        events: [
            { timestamp: now, type: "mission.created", message: `Mission created for goal: ${goal}` },
        ],
        findings: [],
    };
    writeMissionState(root, state, config);
    return state;
}
export function readMissionState(root, config, missionId) {
    const dir = resolveMissionStateDir(root, config);
    if (!existsSync(dir))
        return null;
    let resolvedId = missionId;
    if (!resolvedId) {
        const files = readdirSync(dir)
            .filter((name) => name.endsWith(".json"))
            .sort((left, right) => statSync(join(dir, right)).mtimeMs - statSync(join(dir, left)).mtimeMs);
        resolvedId = files[0]?.replace(/\.json$/, "");
    }
    if (!resolvedId)
        return null;
    const filePath = join(dir, `${resolvedId}.json`);
    if (!existsSync(filePath))
        return null;
    const parsed = MissionStateSchema.safeParse(JSON.parse(readFileSync(filePath, "utf8")));
    return parsed.success ? parsed.data : null;
}
export function appendMissionHandoff(root, handoff, config, missionId) {
    const state = readMissionState(root, config, missionId);
    if (!state)
        return null;
    const now = new Date().toISOString();
    state.handoffs.push(handoff);
    state.updatedAt = now;
    state.status = handoff.status === "failed" ? "blocked" : "in_progress";
    state.events.push({
        timestamp: now,
        type: "mission.handoff_submitted",
        message: `${handoff.role} submitted handoff ${handoff.runId}`,
    });
    writeMissionState(root, state, config);
    return state;
}
export function applyValidatorResult(root, result, config, missionId) {
    const state = readMissionState(root, config, missionId);
    if (!state)
        return null;
    const now = new Date().toISOString();
    const nextFindings = result.findings.map((finding, index) => ({
        ...finding,
        id: finding.id || `${result.runId}-finding-${index + 1}`,
        status: "open",
    }));
    state.findings.push(...nextFindings);
    state.updatedAt = now;
    state.events.push({
        timestamp: now,
        type: "mission.validator_result",
        message: `${result.validator} validator ${result.status}: ${result.summary}`,
    });
    if (result.status === "failed" && nextFindings.length > 0) {
        const existingIds = new Set(state.plan.slices.map((slice) => slice.id));
        for (const finding of nextFindings) {
            const repairId = `${finding.id}-repair`;
            if (existingIds.has(repairId))
                continue;
            state.plan.slices.push({
                id: repairId,
                title: `Repair: ${finding.summary}`,
                kind: "repair",
                status: "planned",
                summary: finding.details,
                dependsOn: finding.relatedSliceId ? [finding.relatedSliceId] : undefined,
            });
        }
        state.status = "blocked";
    }
    writeMissionState(root, state, config);
    return state;
}
