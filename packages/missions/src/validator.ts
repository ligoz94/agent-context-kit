import { MissionFinding, ValidatorResult } from "./schemas.js";

export interface ValidatorInput {
  validator: "scrutiny" | "behavioral" | "review";
  runId: string;
  summary: string;
  failedChecks?: string[];
  relatedSliceId?: string;
}

export function createValidatorResult(input: ValidatorInput): ValidatorResult {
  const findings: Omit<MissionFinding, "status">[] = (input.failedChecks ?? []).map((check, index) => ({
    id: `${input.runId}-finding-${index + 1}`,
    validator: input.validator,
    severity: input.validator === "behavioral" ? "high" : "medium",
    summary: check,
    details: input.summary,
    relatedSliceId: input.relatedSliceId,
  }));

  return {
    runId: input.runId,
    validator: input.validator,
    status: findings.length > 0 ? "failed" : "passed",
    summary: input.summary,
    findings,
  };
}