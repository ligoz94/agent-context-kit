import { MissionConfig } from "./state.js";
import { MissionHandoffCommand, MissionSlice, MissionState, ValidationAssertion, ValidatorResult } from "./schemas.js";
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
export declare function runMissionLoop(root: string, options: MissionLoopOptions): Promise<MissionLoopResult>;
//# sourceMappingURL=runner.d.ts.map