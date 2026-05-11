import { ValidatorResult } from "./schemas.js";
export interface ValidatorInput {
    validator: "scrutiny" | "behavioral" | "review";
    runId: string;
    summary: string;
    failedChecks?: string[];
    relatedSliceId?: string;
}
export declare function createValidatorResult(input: ValidatorInput): ValidatorResult;
//# sourceMappingURL=validator.d.ts.map