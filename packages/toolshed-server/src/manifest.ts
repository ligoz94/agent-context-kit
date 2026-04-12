import { z } from "zod/v4";

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
          })
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
      })
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
});

export const ManifestSchema = BaseManifest.extend({
  profiles: z.record(z.string(), BaseManifest).optional()
});

export type ManifestValid = z.infer<typeof ManifestSchema>;
