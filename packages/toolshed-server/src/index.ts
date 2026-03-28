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
  toolName,
} from "./handlers.js";

// ── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const manifestFlag = args.indexOf("--manifest");
const manifestPath =
  manifestFlag >= 0
    ? resolve(args[manifestFlag + 1]!)
    : resolve(process.cwd(), "manifest.yaml");

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
  return obj && typeof obj === 'object' && !Array.isArray(obj);
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
    console.error(`[toolshed] Warning: Profile '${cliProfile}' requested but not found in manifest.yaml.`);
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
      "Returns L0 context: project values, architecture primer, and glossary. " +
      "Call this at the start of any session to orient yourself.",
    inputSchema: emptyArgs,
  },
  async () => handleGetProjectIdentity(manifest, root),
);

mcp.registerTool(
  toolName(manifest, "get_rules"),
  {
    description:
      "Returns L1 context: context policy and coding standards. " +
      "Call this before any coding or review task.",
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
      "Returns L2 key-learnings: past bugs, wrong turns, hard-won insights. " +
      "Always check this before suggesting a pattern or architectural decision.",
    inputSchema: emptyArgs,
  },
  async () => handleGetLearnings(manifest, root),
);

mcp.registerTool(
  toolName(manifest, "add_learning"),
  {
    description: "Appends a new learning to the project's key-learnings.md file.",
    inputSchema: z.object({
      learning: z.string().describe("The learning text to add (without bullet points)")
    })
  },
  async (input) => handleAddLearning(manifest, root, input)
);

mcp.registerTool(
  toolName(manifest, "get_spec"),
  {
    description:
      "Returns the spec for a named feature from the registry. " +
      "Use list_registry first to see available names.",
    inputSchema: z.object({
      name: z.string().optional().describe("Feature name as listed in the registry"),
    }),
  },
  async (input) => handleGetSpec(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "list_registry"),
  {
    description: "Lists all features in the registry with their name and status.",
    inputSchema: emptyArgs,
  },
  async () => handleListRegistry(manifest),
);

mcp.registerTool(
  toolName(manifest, "update_feature_status"),
  {
    description: "Updates the status of a feature in the project's manifest.yaml registry.",
    inputSchema: z.object({
      name: z.string().describe("The name of the feature exactly as written in the registry"),
      status: z.string().describe("The new status (e.g., in-progress, done, planned)")
    })
  },
  async (input) => handleUpdateFeatureStatus(manifestPath, input)
);

mcp.registerTool(
  toolName(manifest, "lookup_glossary"),
  {
    description: "Looks up the canonical definition of a term from the project glossary.",
    inputSchema: z.object({
      term: z.string().optional().describe("The term to look up"),
    }),
  },
  async (input) => handleLookupGlossary(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "add_glossary_term"),
  {
    description: "Appends a new term and definition to the project's glossary.md file.",
    inputSchema: z.object({
      term: z.string().describe("The term to define"),
      definition: z.string().describe("The definition of the term")
    })
  },
  async (input) => handleAddGlossaryTerm(manifest, root, input)
);

mcp.registerTool(
  toolName(manifest, "get_prompt"),
  {
    description: "Returns a named prompt template from docs/agent/prompts/. Supports variable substitution.",
    inputSchema: z.object({
      name: z.string().optional().describe("Prompt filename without .md extension"),
      variables: z.record(z.string(), z.string()).optional().describe("Variables to substitute {{key}} in the prompt template")
    }),
  },
  async (input) => handleGetPrompt(manifest, root, input),
);

mcp.registerTool(
  toolName(manifest, "list_prompts"),
  {
    description: "Lists all available prompt templates.",
    inputSchema: emptyArgs,
  },
  async () => handleListPrompts(manifest, root),
);

mcp.registerTool(
  toolName(manifest, "search_context"),
  {
    description: "Searches the entire project context (rules, docs, registry) for a query string.",
    inputSchema: z.object({
      query: z.string().describe("The text or regex query to search for")
    })
  },
  async (input) => handleSearchContext(manifest, root, input)
);

mcp.registerTool(
  toolName(manifest, "validate_context"),
  {
    description: "Validates that all files paths described in the manifest exist.",
    inputSchema: emptyArgs
  },
  async () => handleValidateContext(manifest, root)
);

mcp.registerTool(
  toolName(manifest, "get_guardrails"),
  {
    description:
      "Returns the guardrails configured in manifest.yaml: blocked actions, actions requiring " +
      "human approval, and allowed domains. Call this at session start alongside get_project_identity.",
    inputSchema: emptyArgs,
  },
  async () => handleGetGuardrails(manifest),
);

mcp.registerTool(
  toolName(manifest, "request_human_approval"),
  {
    description:
      "Pauses execution and requests explicit human approval before performing a risky action. " +
      "Always call this before actions listed in the guardrails require_approval list. " +
      "Present the result to the user and wait for their response before continuing.",
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
      "Verifies that a previous action produced the expected outcome by running post-condition checks. " +
      "Use after any file write, code generation, or critical state change.",
    inputSchema: z.object({
      description: z.string().describe("Human-readable description of what was just performed."),
      checks: z.array(
        z.object({
          type: z
            .enum(["file_exists", "file_contains", "file_modified_after", "command_succeeds", "http_status", "json_contains"])
            .describe("Type of check to perform."),
          path: z.string().optional().describe("For file-based: relative path to the file to check. For http_status: the URL."),
          command: z.string().optional().describe("For command_succeeds: the bash command to run."),
          expected_status: z.number().optional().describe("For http_status: the expected HTTP status code (e.g. 200)."),
          json_path: z.string().optional().describe("For json_contains: the dot-notation path to the key in the JSON file."),
          value: z.string().optional().describe("For file_contains or json_contains: the expected string value."),
          after: z.string().optional().describe("For file_modified_after: ISO 8601 timestamp to compare modification time against."),
        })
      ).describe("One or more checks to verify the action succeeded."),
    }),
  },
  async (input) => handleVerifyAction(root, input as any),
);

const transport = new StdioServerTransport();
await mcp.connect(transport);
console.error(`[toolshed] Running. Manifest: ${manifestPath}`);
