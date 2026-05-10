import { z } from "zod/v4";

const MissionRoleSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  effort: z.enum(["none", "low", "medium", "high", "n/a", "unknown"]).optional(),
});

const ValidationAssertionSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["scrutiny", "behavioral", "manual"]),
  description: z.string().optional(),
});

const HandoffCommandSchema = z.object({
  command: z.string(),
  exitCode: z.number(),
});

const HandoffSchema = z.object({
  runId: z.string(),
  role: z.enum(["orchestrator", "worker", "validator"]),
  status: z.enum(["completed", "completed_with_findings", "failed"]),
  summary: z.string(),
  filesTouched: z.array(z.string()).optional(),
  commands: z.array(HandoffCommandSchema).optional(),
  issues: z.array(z.string()).optional(),
  nextSuggestedAction: z.string().optional(),
});

const MissionExecutionSchema = z.object({
  worker_commands: z.array(z.string()).optional(),
  validator_commands: z
    .object({
      scrutiny: z.array(z.string()).optional(),
      behavioral: z.array(z.string()).optional(),
      review: z.array(z.string()).optional(),
    })
    .optional(),
});

const BaseManifest = z.object({
  identity: z
    .object({
      values: z.string().optional(),
      architecture: z.string().optional(),
      glossary: z.string().optional(),
    })
    .optional(),
  rules: z
    .object({
      policy: z.string().optional(),
      standards: z
        .array(
          z.object({
            name: z.string(),
            path: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
  knowledge: z
    .object({
      learnings: z.string().optional(),
    })
    .optional(),
  registry: z
    .array(
      z.object({
        name: z.string(),
        path: z.string(),
        status: z.string().optional(),
      }),
    )
    .optional(),
  prompts: z
    .object({
      dir: z.string().optional(),
    })
    .optional(),
  templates: z
    .object({
      dir: z.string().optional(),
    })
    .optional(),
  toolshed: z
    .object({
      tool_aliases: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  guardrails: z
    .object({
      blocked_actions: z
        .array(z.string())
        .optional()
        .describe("Action patterns the agent must never perform."),
      require_approval: z
        .array(z.string())
        .optional()
        .describe("Action patterns that require explicit human approval before execution."),
      allowed_domains: z
        .array(z.string())
        .optional()
        .describe("Domains the agent is permitted to interact with (e.g. for browser agents)."),
    })
    .optional(),
  mission: z
    .object({
      enabled: z.boolean().optional(),
      state_dir: z.string().optional(),
      roles: z
        .object({
          orchestrator: MissionRoleSchema.optional(),
          worker: MissionRoleSchema.optional(),
          validator: MissionRoleSchema.optional(),
        })
        .optional(),
      validation_contract: z
        .object({
          required: z.boolean().optional(),
          assertions: z.array(ValidationAssertionSchema).optional(),
        })
        .optional(),
      handoff: z
        .object({
          required: z.boolean().optional(),
          schema_version: z.string().optional(),
          example: HandoffSchema.optional(),
        })
        .optional(),
      execution: MissionExecutionSchema.optional(),
    })
    .optional(),
});

export const ManifestSchema = BaseManifest.extend({
  profiles: z.record(z.string(), BaseManifest).optional(),
});

export type ManifestValid = z.infer<typeof ManifestSchema>;
