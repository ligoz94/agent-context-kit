import { MissionState, ValidationAssertion, MissionHandoff, MissionPlan, MissionSourceIssue, ValidatorResult } from "./schemas.js";
export interface MissionConfig {
    stateDir?: string;
    defaultAssertions?: ValidationAssertion[];
}
export declare function resolveMissionStateDir(root: string, config?: MissionConfig): string;
export declare function generateMissionId(goal: string): string;
export declare function writeMissionState(root: string, state: MissionState, config?: MissionConfig): void;
export declare function createMissionState(root: string, goal: string, config?: MissionConfig, missionId?: string, plan?: MissionPlan, sourceIssue?: MissionSourceIssue): MissionState;
export declare function readMissionState(root: string, config?: MissionConfig, missionId?: string): MissionState | null;
export declare function appendMissionHandoff(root: string, handoff: MissionHandoff, config?: MissionConfig, missionId?: string): MissionState | null;
export declare function applyValidatorResult(root: string, result: ValidatorResult, config?: MissionConfig, missionId?: string): MissionState | null;
//# sourceMappingURL=state.d.ts.map