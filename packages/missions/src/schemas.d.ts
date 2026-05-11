import { z } from "zod";
export declare const ValidationAssertionSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    type: z.ZodEnum<{
        scrutiny: "scrutiny";
        behavioral: "behavioral";
        manual: "manual";
    }>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const MissionSourceIssueSchema: z.ZodObject<{
    number: z.ZodNumber;
    title: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    repo: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const MissionSliceSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    kind: z.ZodEnum<{
        plan: "plan";
        implement: "implement";
        validate: "validate";
        repair: "repair";
    }>;
    status: z.ZodEnum<{
        planned: "planned";
        in_progress: "in_progress";
        blocked: "blocked";
        completed: "completed";
    }>;
    summary: z.ZodOptional<z.ZodString>;
    dependsOn: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const MissionPlanSchema: z.ZodObject<{
    summary: z.ZodString;
    slices: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        kind: z.ZodEnum<{
            plan: "plan";
            implement: "implement";
            validate: "validate";
            repair: "repair";
        }>;
        status: z.ZodEnum<{
            planned: "planned";
            in_progress: "in_progress";
            blocked: "blocked";
            completed: "completed";
        }>;
        summary: z.ZodOptional<z.ZodString>;
        dependsOn: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const MissionHandoffCommandSchema: z.ZodObject<{
    command: z.ZodString;
    exitCode: z.ZodNumber;
}, z.core.$strip>;
export declare const MissionHandoffSchema: z.ZodObject<{
    runId: z.ZodString;
    role: z.ZodEnum<{
        orchestrator: "orchestrator";
        worker: "worker";
        validator: "validator";
    }>;
    status: z.ZodEnum<{
        completed: "completed";
        completed_with_findings: "completed_with_findings";
        failed: "failed";
    }>;
    summary: z.ZodString;
    filesTouched: z.ZodOptional<z.ZodArray<z.ZodString>>;
    commands: z.ZodOptional<z.ZodArray<z.ZodObject<{
        command: z.ZodString;
        exitCode: z.ZodNumber;
    }, z.core.$strip>>>;
    issues: z.ZodOptional<z.ZodArray<z.ZodString>>;
    nextSuggestedAction: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const MissionEventSchema: z.ZodObject<{
    timestamp: z.ZodString;
    type: z.ZodString;
    message: z.ZodString;
}, z.core.$strip>;
export declare const MissionFindingSchema: z.ZodObject<{
    id: z.ZodString;
    validator: z.ZodEnum<{
        scrutiny: "scrutiny";
        behavioral: "behavioral";
        review: "review";
    }>;
    severity: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>;
    summary: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
    relatedSliceId: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<{
        open: "open";
        accepted: "accepted";
        resolved: "resolved";
    }>;
}, z.core.$strip>;
export declare const ValidatorResultSchema: z.ZodObject<{
    runId: z.ZodString;
    validator: z.ZodEnum<{
        scrutiny: "scrutiny";
        behavioral: "behavioral";
        review: "review";
    }>;
    status: z.ZodEnum<{
        failed: "failed";
        passed: "passed";
    }>;
    summary: z.ZodString;
    findings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        summary: z.ZodString;
        validator: z.ZodEnum<{
            scrutiny: "scrutiny";
            behavioral: "behavioral";
            review: "review";
        }>;
        severity: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
        }>;
        details: z.ZodOptional<z.ZodString>;
        relatedSliceId: z.ZodOptional<z.ZodString>;
        id: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const MissionStateSchema: z.ZodObject<{
    id: z.ZodString;
    goal: z.ZodString;
    status: z.ZodEnum<{
        planned: "planned";
        in_progress: "in_progress";
        blocked: "blocked";
        completed: "completed";
    }>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    sourceIssue: z.ZodOptional<z.ZodObject<{
        number: z.ZodNumber;
        title: z.ZodString;
        body: z.ZodOptional<z.ZodString>;
        repo: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    plan: z.ZodObject<{
        summary: z.ZodString;
        slices: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            kind: z.ZodEnum<{
                plan: "plan";
                implement: "implement";
                validate: "validate";
                repair: "repair";
            }>;
            status: z.ZodEnum<{
                planned: "planned";
                in_progress: "in_progress";
                blocked: "blocked";
                completed: "completed";
            }>;
            summary: z.ZodOptional<z.ZodString>;
            dependsOn: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    validationContract: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        type: z.ZodEnum<{
            scrutiny: "scrutiny";
            behavioral: "behavioral";
            manual: "manual";
        }>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    handoffs: z.ZodArray<z.ZodObject<{
        runId: z.ZodString;
        role: z.ZodEnum<{
            orchestrator: "orchestrator";
            worker: "worker";
            validator: "validator";
        }>;
        status: z.ZodEnum<{
            completed: "completed";
            completed_with_findings: "completed_with_findings";
            failed: "failed";
        }>;
        summary: z.ZodString;
        filesTouched: z.ZodOptional<z.ZodArray<z.ZodString>>;
        commands: z.ZodOptional<z.ZodArray<z.ZodObject<{
            command: z.ZodString;
            exitCode: z.ZodNumber;
        }, z.core.$strip>>>;
        issues: z.ZodOptional<z.ZodArray<z.ZodString>>;
        nextSuggestedAction: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    events: z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        type: z.ZodString;
        message: z.ZodString;
    }, z.core.$strip>>;
    findings: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        validator: z.ZodEnum<{
            scrutiny: "scrutiny";
            behavioral: "behavioral";
            review: "review";
        }>;
        severity: z.ZodEnum<{
            low: "low";
            medium: "medium";
            high: "high";
        }>;
        summary: z.ZodString;
        details: z.ZodOptional<z.ZodString>;
        relatedSliceId: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<{
            open: "open";
            accepted: "accepted";
            resolved: "resolved";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ValidationAssertion = z.infer<typeof ValidationAssertionSchema>;
export type MissionSourceIssue = z.infer<typeof MissionSourceIssueSchema>;
export type MissionSlice = z.infer<typeof MissionSliceSchema>;
export type MissionPlan = z.infer<typeof MissionPlanSchema>;
export type MissionHandoffCommand = z.infer<typeof MissionHandoffCommandSchema>;
export type MissionHandoff = z.infer<typeof MissionHandoffSchema>;
export type MissionEvent = z.infer<typeof MissionEventSchema>;
export type MissionFinding = z.infer<typeof MissionFindingSchema>;
export type ValidatorResult = z.infer<typeof ValidatorResultSchema>;
export type MissionState = z.infer<typeof MissionStateSchema>;
//# sourceMappingURL=schemas.d.ts.map