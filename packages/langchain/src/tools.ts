import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import yaml from "js-yaml";
import {
  handleGetProjectIdentity,
  handleGetRules,
  handleGetLearnings,
  handleAddLearning,
  handleGetSpec,
  handleListRegistry,
  handleUpdateFeatureStatus,
  handleLookupGlossary,
  handleAddGlossaryTerm,
  handleGetPrompt,
  handleListPrompts,
  handleSearchContext,
  handleValidateContext,
  handleGetGuardrails,
  handleRequestHumanApproval,
  handleVerifyAction,
  handleCreateMission,
  handleCreateMissionFromIssue,
  handleGetMissionState,
  handleSubmitMissionHandoff,
  handleListMissionEvents,
  handleSubmitValidatorResult,
  handleRunMissionLoop,
  toolName,
  Manifest,
} from "@agent-context-kit/toolshed-server/dist/handlers.js";
import { ManifestSchema } from "@agent-context-kit/toolshed-server/dist/manifest.js";

function loadManifest(manifestPath: string): { manifest: Manifest; root: string } {
  if (!existsSync(manifestPath)) {
    throw new Error(`[context-kit] manifest.yaml not found at: ${manifestPath}`);
  }

  let rawManifest: unknown;
  try {
    rawManifest = yaml.load(readFileSync(manifestPath, "utf8"));
  } catch (e: any) {
    throw new Error(`[context-kit] Invalid manifest.yaml structure: ${e.message}`);
  }

  const parsed = ManifestSchema.safeParse(rawManifest);
  if (!parsed.success) {
    throw new Error(
      `[context-kit] Invalid manifest.yaml structure: ${JSON.stringify(parsed.error.issues)}`,
    );
  }

  return { manifest: parsed.data as Manifest, root: dirname(manifestPath) };
}

function isObj(obj: any): boolean {
  return obj && typeof obj === "object" && !Array.isArray(obj);
}

function deepMerge(target: any, source: any): any {
  if (!isObj(target) || !isObj(source)) return source ?? target;
  const output: any = { ...target };
  for (const key of Object.keys(source)) {
    if (isObj(source[key])) {
      if (!(key in target)) Object.assign(output, { [key]: source[key] });
      else output[key] = deepMerge(target[key], source[key]);
    } else {
      Object.assign(output, { [key]: source[key] });
    }
  }
  return output;
}

export interface ContextKitOptions {
  profile?: string;
}

/**
 * Creates an array of LangChain DynamicStructuredTools that expose the same
 * knowledge context as the MCP Toolshed server.
 *
 * @param manifestPath The absolute or relative path to the project's manifest.yaml
 * @param options Configurations like profile overriding.
 * @returns Array of LangChain tools ready for `bindTools()` or AgentExecutor
 */
export function createContextKitTools(
  manifestPath: string,
  options?: ContextKitOptions,
): DynamicStructuredTool[] {
  let { manifest, root } = loadManifest(manifestPath);
  if (options?.profile) {
    const profiles = manifest.profiles as Record<string, any> | undefined;
    if (profiles && profiles[options.profile]) {
      manifest = deepMerge(manifest, profiles[options.profile]);
    } else {
      console.warn(`[context-kit] Warning: Profile '${options.profile}' not found in manifest.`);
    }
  }

  const emptyArgs = z.object({});
  const absManifestPath = resolve(manifestPath);

  return [
    new DynamicStructuredTool<any>({
      name: toolName(manifest, "get_project_identity"),
      description:
        "Returns L0 context: project values, architecture primer, and glossary. " +
        "Call this at the start of any session to orient yourself.",
      schema: emptyArgs,
      func: async () => {
        const res = handleGetProjectIdentity(manifest, root);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "get_rules"),
      description:
        "Returns L1 context: context policy and coding standards. " +
        "Call this before any coding or review task.",
      schema: z.object({
        standard: z
          .string()
          .optional()
          .describe("Optional: name of a specific standard (e.g. 'testing'). Omit for all."),
      }),
      func: async (input: any) => {
        const res = handleGetRules(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "get_learnings"),
      description:
        "Returns L2 key-learnings: past bugs, wrong turns, hard-won insights. " +
        "Always check this before suggesting a pattern or architectural decision.",
      schema: emptyArgs,
      func: async () => {
        const res = handleGetLearnings(manifest, root);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "add_learning"),
      description: "Appends a new learning to the project's key-learnings.md file.",
      schema: z.object({
        learning: z.string().describe("The learning text to add (without bullet points)"),
      }),
      func: async (input: any) => {
        const res = handleAddLearning(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "get_spec"),
      description:
        "Returns the spec for a named feature from the registry. " +
        "Use list_registry first to see available names.",
      schema: z.object({
        name: z.string().optional().describe("Feature name as listed in the registry"),
      }),
      func: async (input: any) => {
        const res = handleGetSpec(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "list_registry"),
      description: "Lists all features in the registry with their name and status.",
      schema: emptyArgs,
      func: async () => {
        const res = handleListRegistry(manifest);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "update_feature_status"),
      description: "Updates the status of a feature in the project's manifest.yaml registry.",
      schema: z.object({
        name: z.string().describe("The name of the feature exactly as written in the registry"),
        status: z.string().describe("The new status (e.g., in-progress, done, planned)"),
      }),
      func: async (input: any) => {
        const res = handleUpdateFeatureStatus(absManifestPath, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "lookup_glossary"),
      description: "Looks up the canonical definition of a term from the project glossary.",
      schema: z.object({
        term: z.string().optional().describe("The term to look up"),
      }),
      func: async (input: any) => {
        const res = handleLookupGlossary(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "add_glossary_term"),
      description: "Appends a new term and definition to the project's glossary.md file.",
      schema: z.object({
        term: z.string().describe("The term to define"),
        definition: z.string().describe("The definition of the term"),
      }),
      func: async (input: any) => {
        const res = handleAddGlossaryTerm(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "get_prompt"),
      description:
        "Returns a named prompt template from docs/agent/prompts/. Supports variable substitution.",
      schema: z.object({
        name: z.string().optional().describe("Prompt filename without .md extension"),
        variables: z
          .record(z.string(), z.string())
          .optional()
          .describe("Variables to substitute {{key}} in the prompt template"),
      }),
      func: async (input: any) => {
        const res = handleGetPrompt(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "list_prompts"),
      description: "Lists all available prompt templates.",
      schema: emptyArgs,
      func: async () => {
        const res = handleListPrompts(manifest, root);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "search_context"),
      description:
        "Searches the entire project context (rules, docs, registry) for a query string.",
      schema: z.object({
        query: z.string().describe("The text or regex query to search for"),
      }),
      func: async (input: any) => {
        const res = handleSearchContext(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "validate_context"),
      description: "Validates that all files paths described in the manifest exist.",
      schema: emptyArgs,
      func: async () => {
        const res = handleValidateContext(manifest, root);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "get_guardrails"),
      description:
        "Returns the guardrails configured in manifest.yaml: blocked actions, actions requiring " +
        "human approval, and allowed domains. Call this at session start alongside get_project_identity.",
      schema: emptyArgs,
      func: async () => {
        const res = handleGetGuardrails(manifest);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "request_human_approval"),
      description:
        "Pauses execution and requests explicit human approval before performing a risky action. " +
        "Always call this before actions listed in the guardrails require_approval list. " +
        "Present the result to the user and wait for their response before continuing.",
      schema: z.object({
        action: z.string().describe("The specific action the agent intends to perform."),
        context: z.string().describe("Why this action is needed and what the expected outcome is."),
        risk_level: z
          .enum(["low", "medium", "high"])
          .optional()
          .describe("Estimated risk level of the action. Defaults to 'medium'."),
      }),
      func: async (input: any) => {
        const res = handleRequestHumanApproval(input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "verify_action"),
      description:
        "Verifies that a previous action produced the expected outcome by running post-condition checks. " +
        "Use after any file write, code generation, or critical state change.",
      schema: z.object({
        description: z.string().describe("Human-readable description of what was just performed."),
        checks: z
          .array(
            z.object({
              type: z
                .enum([
                  "file_exists",
                  "file_contains",
                  "file_modified_after",
                  "command_succeeds",
                  "http_status",
                  "json_contains",
                ])
                .describe("Type of check to perform."),
              path: z
                .string()
                .optional()
                .describe(
                  "For file-based: relative path to the file to check. For http_status: the URL.",
                ),
              command: z
                .string()
                .optional()
                .describe("For command_succeeds: the bash command to run."),
              expected_status: z
                .number()
                .optional()
                .describe("For http_status: the expected HTTP status code (e.g. 200)."),
              json_path: z
                .string()
                .optional()
                .describe("For json_contains: the dot-notation path to the key in the JSON file."),
              value: z
                .string()
                .optional()
                .describe("For file_contains or json_contains: the expected string value."),
              after: z.string().optional().describe("For file_modified_after: ISO 8601 timestamp."),
            }),
          )
          .describe("One or more checks to verify the action succeeded."),
      }),
      func: async (input: any) => {
        const res = await handleVerifyAction(root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "create_mission"),
      description:
        "Creates a new mission state file from a goal and optional validation contract assertions.",
      schema: z.object({
        goal: z.string().describe("The mission goal to track."),
        mission_id: z.string().optional().describe("Optional stable mission identifier."),
        validation_contract: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              type: z.enum(["scrutiny", "behavioral", "manual"]),
              description: z.string().optional(),
            }),
          )
          .optional(),
      }),
      func: async (input: any) => {
        const res = handleCreateMission(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "create_mission_from_issue"),
      description:
        "Fetches a GitHub issue via gh CLI and creates a mission from its title and body.",
      schema: z.object({
        issue_number: z.number().describe("GitHub issue number to convert into a mission."),
        repo: z.string().optional().describe("Optional owner/repo override for gh issue view."),
        mission_id: z.string().optional().describe("Optional stable mission identifier."),
        goal_override: z
          .string()
          .optional()
          .describe("Optional goal override instead of using the issue title."),
      }),
      func: async (input: any) => {
        const res = handleCreateMissionFromIssue(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "get_mission_state"),
      description:
        "Returns the JSON mission state for a mission id or the latest mission if omitted.",
      schema: z.object({
        mission_id: z
          .string()
          .optional()
          .describe("Mission identifier. Omit to fetch the latest mission."),
      }),
      func: async (input: any) => {
        const res = handleGetMissionState(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "submit_mission_handoff"),
      description: "Appends a structured worker or validator handoff to a mission state file.",
      schema: z.object({
        mission_id: z
          .string()
          .optional()
          .describe("Mission identifier. Omit to target the latest mission."),
        handoff: z.object({
          runId: z.string(),
          role: z.enum(["orchestrator", "worker", "validator"]),
          status: z.enum(["completed", "completed_with_findings", "failed"]),
          summary: z.string(),
          filesTouched: z.array(z.string()).optional(),
          commands: z.array(z.object({ command: z.string(), exitCode: z.number() })).optional(),
          issues: z.array(z.string()).optional(),
          nextSuggestedAction: z.string().optional(),
        }),
      }),
      func: async (input: any) => {
        const res = handleSubmitMissionHandoff(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "list_mission_events"),
      description: "Lists mission events for a mission id or the latest mission if omitted.",
      schema: z.object({
        mission_id: z
          .string()
          .optional()
          .describe("Mission identifier. Omit to fetch the latest mission."),
      }),
      func: async (input: any) => {
        const res = handleListMissionEvents(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "submit_validator_result"),
      description:
        "Records a validator result, stores findings, and creates repair slices for failed findings.",
      schema: z.object({
        mission_id: z
          .string()
          .optional()
          .describe("Mission identifier. Omit to target the latest mission."),
        result: z.object({
          runId: z.string(),
          validator: z.enum(["scrutiny", "behavioral", "review"]),
          status: z.enum(["passed", "failed"]),
          summary: z.string(),
          findings: z
            .array(
              z.object({
                id: z.string().optional(),
                validator: z.enum(["scrutiny", "behavioral", "review"]),
                severity: z.enum(["low", "medium", "high"]),
                summary: z.string(),
                details: z.string().optional(),
                relatedSliceId: z.string().optional(),
              }),
            )
            .default([]),
        }),
      }),
      func: async (input: any) => {
        const res = handleSubmitValidatorResult(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "run_mission_loop"),
      description:
        "Runs the local autonomous planner -> worker -> validator mission loop for a mission state file.",
      schema: z.object({
        mission_id: z
          .string()
          .optional()
          .describe("Mission identifier. Omit to target the latest mission."),
        max_iterations: z.number().optional().describe("Maximum loop iterations before stopping."),
        validator: z
          .enum(["scrutiny", "behavioral", "review"])
          .optional()
          .describe("Validator type used by the local loop."),
        simulate_findings: z
          .array(z.string())
          .optional()
          .describe(
            "Optional findings to inject on the first validation pass to exercise repair flows.",
          ),
      }),
      func: async (input: any) => {
        const res = handleRunMissionLoop(manifest, root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),
  ];
}
