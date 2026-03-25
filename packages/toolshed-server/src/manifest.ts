import { z } from "zod/v4";

export const ManifestSchema = z.object({
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
  toolshed: z
    .object({
      tool_aliases: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export type ManifestValid = z.infer<typeof ManifestSchema>;
