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
  handleGetSpec,
  handleListRegistry,
  handleLookupGlossary,
  handleGetPrompt,
  handleListPrompts,
  toolName,
} from "./handlers.js";

// ── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const manifestFlag = args.indexOf("--manifest");
const manifestPath =
  manifestFlag >= 0
    ? resolve(args[manifestFlag + 1]!)
    : resolve(process.cwd(), "manifest.yaml");

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

const manifest = parsed.data;
const root = dirname(manifestPath);

// ── McpServer ────────────────────────────────────────────────────────────────

const emptyArgs = z.object({});

const mcp = new McpServer({ name: "toolshed", version: "0.1.0" });

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
  toolName(manifest, "get_prompt"),
  {
    description: "Returns a named prompt template from docs/agent/prompts/.",
    inputSchema: z.object({
      name: z.string().optional().describe("Prompt filename without .md extension"),
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

const transport = new StdioServerTransport();
await mcp.connect(transport);
console.error(`[toolshed] Running. Manifest: ${manifestPath}`);
