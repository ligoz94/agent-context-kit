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
  handleCheckGate,
  handleAdvanceGate,
  handleGetSessionBootstrap,
  handleDispatchSubagent,
  handleReviewSpec,
  handleReviewPlan,
  handleStartDebugging,
  handleFinishWork,
  handleTestRule,
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
        "Use at the start of any session to orient yourself with project identity.",
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
        "Use before any coding or review task to load context policy and standards.",
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
        "Use before suggesting a pattern or architectural decision. Loads past learnings.",
      schema: emptyArgs,
      func: async () => {
        const res = handleGetLearnings(manifest, root);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "add_learning"),
      description: "Use when you discover a lesson worth remembering. Appends to key-learnings.md.",
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
        "Use when you need the full spec for a feature. Run list_registry first for available names.",
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
      description: "Use to browse all registered features before starting work.",
      schema: emptyArgs,
      func: async () => {
        const res = handleListRegistry(manifest);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "update_feature_status"),
      description: "Use when a feature's status changes (in-progress, done, planned). Updates manifest.yaml.",
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
      description: "Use when you encounter an unfamiliar project term. Looks up canonical definition.",
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
      description: "Use when a new project-specific term needs a canonical definition.",
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
        "Use when you need a structured prompt (triage, implement, review). Supports {{variable}} substitution.",
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
      description: "Use to see what prompt templates are available before calling get_prompt.",
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
        "Use to find relevant documentation across the entire project by keyword.",
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
      description: "Use after setup or sync to verify all documented paths exist.",
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
        "Use at session start alongside get_session_bootstrap. Returns blocked actions, required approvals, allowed domains, and active gates.",
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
        "Use before risky actions (deploy, delete, charge). Pauses for explicit user approval. Required by guardrails require_approval list.",
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
        "Use after file writes, code generation, or state changes to verify expected outcome.",
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
                  "tdd_compliance",
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

    // ── Gates ────────────────────────────────────────────────────────────────

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "check_gate"),
      description:
        "Use before proceeding past a gated phase (design, plan, review, merge). Checks if the required gate has been passed with evidence.",
      schema: z.object({
        gate_name: z.string().describe("Gate name: design-approved, plan-reviewed, code-reviewed, tests-passed, tests-before-code"),
      }),
      func: async (input: any) => {
        const res = handleCheckGate(manifest, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "advance_gate"),
      description:
        "Use AFTER completing a gated phase to record that you passed it. Requires evidence (file path, terminal output, or description).",
      schema: z.object({
        gate_name: z.string().describe("Gate name to advance"),
        evidence: z.string().describe("Path, terminal output, or description proving compliance"),
      }),
      func: async (input: any) => {
        const res = handleAdvanceGate(input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    // ── Session Bootstrap ────────────────────────────────────────────────────

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "get_session_bootstrap"),
      description:
        "Use at the VERY START of any session. Returns layered context (L0 identity, L1 policy, active gates) so you don't start blank.",
      schema: z.object({}),
      func: async () => {
        const res = handleGetSessionBootstrap(manifest, root);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    // ── Sub-agent Dispatch ───────────────────────────────────────────────────

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "dispatch_subagent"),
      description:
        "Use to delegate a focused task to a fresh sub-agent with isolated context. Never inherit current session history. Returns structured status.",
      schema: z.object({
        task_description: z.string().describe("The precise task for the sub-agent, including file paths and expected outcome"),
        context_files: z.array(z.string()).optional().describe("Relative paths to files the sub-agent needs as reference"),
        model: z.enum(["fast", "standard", "capable"]).optional().describe("Model capability hint: fast for mechanical, capable for architecture/review"),
      }),
      func: async (input: any) => {
        const res = handleDispatchSubagent(manifest, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    // ── Reviews ──────────────────────────────────────────────────────────────

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "review_spec"),
      description:
        "Use AFTER writing a design spec, BEFORE creating an implementation plan. Checks completeness, consistency, scope, and YAGNI. Dispatched as fresh review.",
      schema: z.object({
        spec_path: z.string().describe("Relative path to the spec markdown file"),
      }),
      func: async (input: any) => {
        const res = handleReviewSpec(root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "review_plan"),
      description:
        "Use AFTER writing an implementation plan, BEFORE executing. Validates plan covers all spec requirements, tasks are granular (2-5 min), and file paths are explicit.",
      schema: z.object({
        plan_path: z.string().describe("Relative path to the plan markdown file"),
        spec_path: z.string().describe("Relative path to the spec the plan was derived from"),
      }),
      func: async (input: any) => {
        const res = handleReviewPlan(root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    // ── Debugging ────────────────────────────────────────────────────────────

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "start_debugging"),
      description:
        "Use when investigating a bug. Guides through 4-phase forensic process: Observe, Hypothesize, Isolate, Fix & Fortify. Not for simple issues.",
      schema: z.object({
        description: z.string().describe("What bug or unexpected behavior are you investigating?"),
      }),
      func: async (input: any) => {
        const res = handleStartDebugging(input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    // ── Release Engineering ──────────────────────────────────────────────────

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "finish_work"),
      description:
        "Use when a feature branch is complete and ready to merge or PR. Verifies tests, then presents 4 structured options (merge, PR, keep, discard). Never open-ended.",
      schema: z.object({
        branch: z.string().describe("The feature branch name to finish"),
        base_branch: z.string().describe("The target branch (e.g. main, master, develop)"),
        test_command: z.string().optional().describe("Override test command (auto-detected otherwise)"),
      }),
      func: async (input: any) => {
        const res = await handleFinishWork(root, input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),

    // ── Rule/Skill Testing ───────────────────────────────────────────────────

    new DynamicStructuredTool<any>({
      name: toolName(manifest, "test_rule"),
      description:
        "Use BEFORE deploying a new rule or process document. Tests whether the rule actually changes agent behavior using RED/GREEN phases.",
      schema: z.object({
        rule_path: z.string().describe("Relative path to the rule .md file being tested"),
        test_scenario: z.string().describe("A realistic task description to test the rule against"),
      }),
      func: async (input: any) => {
        const res = handleTestRule(input);
        if (res.isError) throw new Error(res.content[0].text);
        return res.content[0].text;
      },
    }),
  ];
}
