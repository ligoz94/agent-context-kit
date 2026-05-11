import { MissionPlan, MissionSourceIssue, ValidationAssertion } from "./schemas.js";
export interface PlannerInput {
    goal: string;
    issue?: MissionSourceIssue;
}
export interface PlannerOutput {
    plan: MissionPlan;
    validationContract: ValidationAssertion[];
}
export declare function createMissionPlan(input: PlannerInput): PlannerOutput;
//# sourceMappingURL=planner.d.ts.map