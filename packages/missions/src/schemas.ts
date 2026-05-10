import { z } from "zod";

export const ValidationAssertionSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["scrutiny", "behavioral", "manual"]),
  description: z.string().optional(),
});

export const MissionSourceIssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().optional(),
  repo: z.string().optional(),
  url: z.string().optional(),
});

export const MissionSliceSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.enum(["plan", "implement", "validate", "repair"]),
  status: z.enum(["planned", "in_progress", "blocked", "completed"]),
  summary: z.string().optional(),
  dependsOn: z.array(z.string()).optional(),
});

export const MissionPlanSchema = z.object({
  summary: z.string(),
  slices: z.array(MissionSliceSchema),
});

export const MissionHandoffCommandSchema = z.object({
  command: z.string(),
  exitCode: z.number(),
});

export const MissionHandoffSchema = z.object({
  runId: z.string(),
  role: z.enum(["orchestrator", "worker", "validator"]),
  status: z.enum(["completed", "completed_with_findings", "failed"]),
  summary: z.string(),
  filesTouched: z.array(z.string()).optional(),
  commands: z.array(MissionHandoffCommandSchema).optional(),
  issues: z.array(z.string()).optional(),
  nextSuggestedAction: z.string().optional(),
});

export const MissionEventSchema = z.object({
  timestamp: z.string(),
  type: z.string(),
  message: z.string(),
});

export const MissionFindingSchema = z.object({
  id: z.string(),
  validator: z.enum(["scrutiny", "behavioral", "review"]),
  severity: z.enum(["low", "medium", "high"]),
  summary: z.string(),
  details: z.string().optional(),
  relatedSliceId: z.string().optional(),
  status: z.enum(["open", "accepted", "resolved"]),
});

export const ValidatorResultSchema = z.object({
  runId: z.string(),
  validator: z.enum(["scrutiny", "behavioral", "review"]),
  status: z.enum(["passed", "failed"]),
  summary: z.string(),
  findings: z
    .array(MissionFindingSchema.omit({ status: true }).extend({ id: z.string().optional() }))
    .default([]),
});

export const MissionStateSchema = z.object({
  id: z.string(),
  goal: z.string(),
  status: z.enum(["planned", "in_progress", "blocked", "completed"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  sourceIssue: MissionSourceIssueSchema.optional(),
  plan: MissionPlanSchema,
  validationContract: z.array(ValidationAssertionSchema),
  handoffs: z.array(MissionHandoffSchema),
  events: z.array(MissionEventSchema),
  findings: z.array(MissionFindingSchema),
});

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
