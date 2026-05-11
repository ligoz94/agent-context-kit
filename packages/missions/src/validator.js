export function createValidatorResult(input) {
    const findings = (input.failedChecks ?? []).map((check, index) => ({
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
