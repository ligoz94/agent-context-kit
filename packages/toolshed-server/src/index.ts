#!/usr/bin/env node

/**
 * @agent-context-kit/toolshed-server
 *
 * MCP server that exposes project knowledge (L0/L1/L2) as tools.
 * Inspired by Stripe's Developer Toolshed pattern.
 *
 * Usage:
 *   npx @agent-context-kit/toolshed-server
 *   npx @agent-context-kit/toolshed-server --manifest ./path/to/manifest.yaml
 *
 * Compatible with any MCP client: Claude, GPT, custom agents.
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import yaml from "js-yaml";
import { z } from "zod/v4";
import { ManifestSchema, ManifestValid } from "./manifest.js";
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
  handleValidateAgentReport,
  handleGetTemplate,
  handleListTemplates,
  handleAnalyzeSpecCompleteness,
  handleCreateMission,
  handleCreateMissionFromIssue,
  handleGetMissionState,
  handleSubmitMissionHandoff,
  handleListMissionEvents,
  handleSubmitValidatorResult,
  handleRunMissionLoop,
  handleCheckGate,
  handleAdvanceGate,
  handleReviewSpecCompliance,
  handleReviewCodeQuality,
  handleVerifyCompletion,
  handleGetSessionBootstrap,
  handleDispatchSubagent,
  handleReviewSpec,
  handleReviewPlan,
  handleStartDebugging,
  handleFinishWork,
  handleTestRule,
  toolName,
} from "./handlers.js";

// ── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const manifestFlag = args.indexOf("--manifest");
const manifestPath =
  manifestFlag >= 0 ? resolve(args[manifestFlag + 1]!) : resolve(process.cwd(), "manifest.yaml");

const profileFlag = args.indexOf("--profile");
const cliProfile = profileFlag >= 0 ? args[profileFlag + 1] : undefined;

if (!existsSync(manifestPath)) {
  console.error(`[toolshed] manifest.yaml not found at: ${manifestPath}`);
  console.error(`[toolshed] Run from your project root or pass --manifest <path>`);
  process.exit(1);
}

let rawManifest: unknown;
try {
  rawManifest = yaml.load(readFileSync(manifestPath, "utf8"));
} catch (e) {
  console.error(`[toolshed] manifest.yaml is not valid YAML: ${(e as Error).message}`);
  process.exit(1);
}

const parsed = ManifestSchema.safeParse(rawManifest);
if (!parsed.success) {
  console.error(`[toolshed] Invalid manifest.yaml structure:`);
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
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

let manifest = parsed.data as Record<string, any>;
if (cliProfile) {
  const profiles = manifest.profiles as Record<string, any> | undefined;
  if (profiles && profiles[cliProfile]) {
    manifest = deepMerge(manifest, profiles[cliProfile]);
    console.error(`[toolshed] Bound to profile: ${cliProfile}`);
  } else {
    console.error(
      `[toolshed] Warning: Profile '${cliProfile}' requested but not found in manifest.yaml.`,
    );
  }
}

const root = dirname(manifestPath);

// ── McpServer ────────────────────────────────────────────────────────────────

const emptyArgs = z.object({});

const mcp = new McpServer({ name: "toolshed", version: "0.2.0" });

mcp.registerTool(
  toolName(manifest, "get_project_identity"),
  {
    description:
      "Use at the start of any session to orient yourself with project identity.",
    inputSchema: emptyArgs,
  },
  async () => handleGetProjectIdentity(manifest, root),
);

mcp.registerTool(
  toolName(manifest, "get_rules"),
  {
    description:
      "Use before any coding or review task to load context policy and standards.",
    inputSchema: z.object({
      standard: z
        .string()
        .optional()
        .describe("Optional: name of a specific standard (e.g. 'testing'). Omit for all."),
    }),
  },
  async (input) => handleGetRules(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "get_learnings"),
  {
    description:
      "Use before suggesting a pattern or architectural decision. Loads past learnings.",
    inputSchema: emptyArgs,
  },
  async () => handleGetLearnings(manifest, root),
);

mcp.registerTool(
  toolName(manifest, "add_learning"),
  {
    description: "Use when you discover a lesson worth remembering. Appends to key-learnings.md.",
    inputSchema: z.object({
      learning: z.string().describe("The learning text to add (without bullet points)"),
    }),
  },
  async (input) => handleAddLearning(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "get_spec"),
  {
    description:
      "Use when you need the full spec for a feature. Run list_registry first for available names.",
    inputSchema: z.object({
      name: z.string().optional().describe("Feature name as listed in the registry"),
    }),
  },
  async (input) => handleGetSpec(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "list_registry"),
  {
    description: "Use to browse all registered features before starting work.",
    inputSchema: emptyArgs,
  },
  async () => handleListRegistry(manifest),
);

mcp.registerTool(
  toolName(manifest, "update_feature_status"),
  {
    description: "Use when a feature's status changes (in-progress, done, planned). Updates manifest.yaml.",
    inputSchema: z.object({
      name: z.string().describe("The name of the feature exactly as written in the registry"),
      status: z.string().describe("The new status (e.g., in-progress, done, planned)"),
    }),
  },
  async (input) => handleUpdateFeatureStatus(manifestPath, input),
);

mcp.registerTool(
  toolName(manifest, "lookup_glossary"),
  {
    description: "Use when you encounter an unfamiliar project term. Looks up canonical definition.",
    inputSchema: z.object({
      term: z.string().optional().describe("The term to look up"),
    }),
  },
  async (input) => handleLookupGlossary(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "add_glossary_term"),
  {
    description: "Use when a new project-specific term needs a canonical definition.",
    inputSchema: z.object({
      term: z.string().describe("The term to define"),
      definition: z.string().describe("The definition of the term"),
    }),
  },
  async (input) => handleAddGlossaryTerm(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "get_prompt"),
  {
    description:
      "Use when you need a structured prompt (triage, implement, review). Supports {{variable}} substitution.",
    inputSchema: z.object({
      name: z.string().optional().describe("Prompt filename without .md extension"),
      variables: z
        .record(z.string(), z.string())
        .optional()
        .describe("Variables to substitute {{key}} in the prompt template"),
    }),
  },
  async (input) => handleGetPrompt(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "list_prompts"),
  {
    description: "Use to see what prompt templates are available before calling get_prompt.",
    inputSchema: emptyArgs,
  },
  async () => handleListPrompts(manifest, root),
);

mcp.registerTool(
  toolName(manifest, "search_context"),
  {
    description: "Use to find relevant documentation across the entire project by keyword.",
    inputSchema: z.object({
      query: z.string().describe("The text or regex query to search for"),
    }),
  },
  async (input) => handleSearchContext(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "validate_context"),
  {
    description: "Use after setup or sync to verify all documented paths exist.",
    inputSchema: emptyArgs,
  },
  async () => handleValidateContext(manifest, root),
);

mcp.registerTool(
  toolName(manifest, "get_template"),
  {
    description:
      "Use when you need a starting template for PR body, commit message, or spec.",
    inputSchema: z.object({
      name: z.string().optional().describe("Template filename without .md extension"),
    }),
  },
  async (input) => handleGetTemplate(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "list_templates"),
  {
    description: "Use to see what templates are available before calling get_template.",
    inputSchema: emptyArgs,
  },
  async () => handleListTemplates(manifest, root),
);

mcp.registerTool(
  toolName(manifest, "validate_agent_report"),
  {
    description:
      "Use before creating a PR to validate the description format against PNA standard.",
    inputSchema: z.object({
      pr_body: z.string().describe("The full Markdown content of the PR description."),
    }),
  },
  async (input) => handleValidateAgentReport(input),
);

mcp.registerTool(
  toolName(manifest, "analyze_spec_completeness"),
  {
    description:
      "Use after writing a spec to check for required Intent Engineering categories before implementation.",
    inputSchema: z.object({
      path: z.string().describe("The relative path to the Markdown file."),
    }),
  },
  async (input) => handleAnalyzeSpecCompleteness(root, input),
);

mcp.registerTool(
  toolName(manifest, "create_mission"),
  {
    description:
      "Use to start tracking structured work. Creates a mission state file from a goal.",
    inputSchema: z.object({
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
  },
  async (input) => handleCreateMission(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "create_mission_from_issue"),
  {
    description: "Use to convert a GitHub issue into a structured mission. Requires gh CLI.",
    inputSchema: z.object({
      issue_number: z.number().describe("GitHub issue number to convert into a mission."),
      repo: z.string().optional().describe("Optional owner/repo override for gh issue view."),
      mission_id: z.string().optional().describe("Optional stable mission identifier."),
      goal_override: z
        .string()
        .optional()
        .describe("Optional goal override instead of using the issue title."),
    }),
  },
  async (input) => handleCreateMissionFromIssue(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "get_mission_state"),
  {
    description:
      "Use to inspect mission progress and findings. Omit mission_id for latest mission.",
    inputSchema: z.object({
      mission_id: z
        .string()
        .optional()
        .describe("Mission identifier. Omit to fetch the latest mission."),
    }),
  },
  async (input) => handleGetMissionState(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "submit_mission_handoff"),
  {
    description: "Use after completing a mission slice to record the handoff and outcome.",
    inputSchema: z.object({
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
  },
  async (input) => handleSubmitMissionHandoff(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "list_mission_events"),
  {
    description: "Use to review the timeline of a mission. Omit mission_id for latest mission.",
    inputSchema: z.object({
      mission_id: z
        .string()
        .optional()
        .describe("Mission identifier. Omit to fetch the latest mission."),
    }),
  },
  async (input) => handleListMissionEvents(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "submit_validator_result"),
  {
    description:
      "Use after validation to record findings. Failed findings auto-create repair slices.",
    inputSchema: z.object({
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
  },
  async (input) => handleSubmitValidatorResult(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "run_mission_loop"),
  {
    description:
      "Use to execute a mission autonomously. Runs planner -> worker -> validator loop until completion.",
    inputSchema: z.object({
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
  },
  async (input) => handleRunMissionLoop(manifest, root, input),
);

// ── Gates ──────────────────────────────────────────────────────────────────

mcp.registerTool(
  toolName(manifest, "check_gate"),
  {
    description:
      "Use before proceeding past a gated phase (design, plan, review, merge). Checks if the required gate has been passed with evidence.",
    inputSchema: z.object({
      gate_name: z.string().describe("Gate name: design-approved, plan-reviewed, code-reviewed, tests-passed, tests-before-code, spec-compliance, code-quality, verified-completion"),
    }),
  },
  async (input) => handleCheckGate(manifest, input),
);

mcp.registerTool(
  toolName(manifest, "advance_gate"),
  {
    description:
      "Use AFTER completing a gated phase to record that you passed it. Requires evidence (file path, terminal output, or description).",
    inputSchema: z.object({
      gate_name: z.string().describe("Gate name to advance"),
      evidence: z.string().describe("Path, terminal output, or description proving compliance"),
    }),
  },
  async (input) => handleAdvanceGate(input as any),
);

// ── Session Bootstrap ─────────────────────────────────────────────────────

mcp.registerTool(
  toolName(manifest, "get_session_bootstrap"),
  {
    description:
      "Use at the VERY START of any session. Returns layered context (L0 identity, L1 policy, active gates) so you don't start blank.",
    inputSchema: emptyArgs,
  },
  async () => handleGetSessionBootstrap(manifest, root),
);

// ── Sub-agent Dispatch ────────────────────────────────────────────────────

mcp.registerTool(
  toolName(manifest, "dispatch_subagent"),
  {
    description:
      "Use to delegate a focused task to a fresh sub-agent with isolated context. Never inherit current session history. Returns structured status.",
    inputSchema: z.object({
      task_description: z.string().describe("The precise task for the sub-agent, including file paths and expected outcome"),
      context_files: z.array(z.string()).optional().describe("Relative paths to files the sub-agent needs as reference"),
      model: z.enum(["fast", "standard", "capable"]).optional().describe("Model capability hint: fast for mechanical, capable for architecture/review"),
    }),
  },
  async (input) => handleDispatchSubagent(manifest, input as any),
);

// ── Reviews ───────────────────────────────────────────────────────────────

mcp.registerTool(
  toolName(manifest, "review_spec"),
  {
    description:
      "Use AFTER writing a design spec, BEFORE creating an implementation plan. Checks completeness, consistency, scope, and YAGNI. Dispatched as fresh review.",
    inputSchema: z.object({
      spec_path: z.string().describe("Relative path to the spec markdown file"),
    }),
  },
  async (input) => handleReviewSpec(root, input),
);

mcp.registerTool(
  toolName(manifest, "review_plan"),
  {
    description:
      "Use AFTER writing an implementation plan, BEFORE executing. Validates plan covers all spec requirements, tasks are granular (2-5 min), and file paths are explicit.",
    inputSchema: z.object({
      plan_path: z.string().describe("Relative path to the plan markdown file"),
      spec_path: z.string().describe("Relative path to the spec the plan was derived from"),
    }),
  },
  async (input) => handleReviewPlan(root, input as any),
);

// ── Debugging ─────────────────────────────────────────────────────────────

mcp.registerTool(
  toolName(manifest, "start_debugging"),
  {
    description:
      "Use when investigating a bug. Guides through 4-phase forensic process: Observe, Hypothesize, Isolate, Fix & Fortify. Not for simple issues.",
    inputSchema: z.object({
      description: z.string().describe("What bug or unexpected behavior are you investigating?"),
    }),
  },
  async (input) => handleStartDebugging(input),
);

// ── Release Engineering ───────────────────────────────────────────────────

mcp.registerTool(
  toolName(manifest, "finish_work"),
  {
    description:
      "Use when a feature branch is complete and ready to merge or PR. Verifies tests, then presents 4 structured options (merge, PR, keep, discard). Never open-ended.",
    inputSchema: z.object({
      branch: z.string().describe("The feature branch name to finish"),
      base_branch: z.string().describe("The target branch (e.g. main, master, develop)"),
      test_command: z.string().optional().describe("Override test command (auto-detected otherwise)"),
    }),
  },
  async (input) => handleFinishWork(root, input as any),
);

// ── Rule/Skill Testing ────────────────────────────────────────────────────

mcp.registerTool(
  toolName(manifest, "test_rule"),
  {
    description:
      "Use BEFORE deploying a new rule or process document. Tests whether the rule actually changes agent behavior using RED/GREEN phases.",
    inputSchema: z.object({
      rule_path: z.string().describe("Relative path to the rule .md file being tested"),
      test_scenario: z.string().describe("A realistic task description to test the rule against"),
    }),
  },
  async (input) => handleTestRule(input as any),
);

// ── Post-Implementation Reviews ──────────────────────────────────────────

mcp.registerTool(
  toolName(manifest, "review_spec_compliance"),
  {
    description:
      "Use AFTER implementation, BEFORE merging. Validates that the code covers all requirements from the spec. Checks implementation files for keyword evidence of each spec requirement. Second gate in the flow (spec compliance before code quality).",
    inputSchema: z.object({
      spec_path: z.string().describe("Relative path to the spec markdown file that was implemented against"),
      implementation_paths: z.array(z.string()).describe("Relative paths to the files that were implemented or modified"),
    }),
  },
  async (input) => handleReviewSpecCompliance(root, input),
);

mcp.registerTool(
  toolName(manifest, "review_code_quality"),
  {
    description:
      "Use AFTER spec compliance passes, BEFORE merge. Runs lint/typecheck, checks file sizes, flags TODOs and console.log calls. Third gate in the flow (spec compliance -> code quality -> merge).",
    inputSchema: z.object({
      paths: z.array(z.string()).describe("Relative paths to implementation files to review"),
      lint_command: z.string().optional().describe("Shell command for linting (e.g. 'npm run lint'). Omit to skip"),
      typecheck_command: z.string().optional().describe("Shell command for type checking (e.g. 'npx tsc --noEmit'). Omit to skip"),
    }),
  },
  async (input) => handleReviewCodeQuality(root, input as any),
);

mcp.registerTool(
  toolName(manifest, "verify_completion"),
  {
    description:
      "Use AFTER spec compliance and code quality pass, BEFORE claiming work is complete. Requires FRESH terminal output (not 'I ran it before'). Rejects rationalization language (should, probably, seems to). Final gate: spec compliance → code quality → verified completion.",
    inputSchema: z.object({
      claim_description: z.string().describe("What you are claiming (e.g. 'Tests pass', 'Build succeeds', 'Bug fixed')"),
      claimed_outcome: z.string().describe("The expected outcome (e.g. '0 failures', 'exit code 0')"),
      verification_command: z.string().describe("The FULL command to run NOW for fresh evidence"),
    }),
  },
  async (input) => handleVerifyCompletion(root, input as any),
);

mcp.registerTool(
  toolName(manifest, "get_guardrails"),
  {
    description:
      "Use at session start alongside get_session_bootstrap. Returns blocked actions, required approvals, allowed domains, and active gates.",
    inputSchema: emptyArgs,
  },
  async () => handleGetGuardrails(manifest),
);

mcp.registerTool(
  toolName(manifest, "request_human_approval"),
  {
    description:
      "Use before risky actions (deploy, delete, charge). Pauses for explicit user approval. Required by guardrails require_approval list.",
    inputSchema: z.object({
      action: z.string().describe("The specific action the agent intends to perform."),
      context: z.string().describe("Why this action is needed and what the expected outcome is."),
      risk_level: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("Estimated risk level of the action. Defaults to 'medium'."),
    }),
  },
  async (input) => handleRequestHumanApproval(input as any),
);

mcp.registerTool(
  toolName(manifest, "verify_action"),
  {
    description:
      "Use after file writes, code generation, or state changes to verify expected outcome.",
    inputSchema: z.object({
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
            after: z
              .string()
              .optional()
              .describe(
                "For file_modified_after: ISO 8601 timestamp to compare modification time against.",
              ),
          }),
        )
        .describe("One or more checks to verify the action succeeded."),
    }),
  },
  async (input) => handleVerifyAction(root, input as any),
);

const transport = new StdioServerTransport();
await mcp.connect(transport);
console.error(`[toolshed] Running. Manifest: ${manifestPath}`);
