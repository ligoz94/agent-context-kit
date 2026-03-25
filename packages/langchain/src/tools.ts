import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { existsSync, readFileSync } from "fs";
import { dirname } from "path";
import yaml from "js-yaml";
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
    throw new Error(`[context-kit] Invalid manifest.yaml structure: ${JSON.stringify(parsed.error.issues)}`);
  }

  return { manifest: parsed.data as Manifest, root: dirname(manifestPath) };
}

/**
 * Creates an array of LangChain DynamicStructuredTools that expose the same
 * knowledge context as the MCP Toolshed server.
 *
 * @param manifestPath The absolute or relative path to the project's manifest.yaml
 * @returns Array of LangChain tools ready for `bindTools()` or AgentExecutor
 */
export function createContextKitTools(manifestPath: string): DynamicStructuredTool[] {
  const { manifest, root } = loadManifest(manifestPath);
  const emptyArgs = z.object({});

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
      name: toolName(manifest, "get_prompt"),
      description: "Returns a named prompt template from docs/agent/prompts/.",
      schema: z.object({
        name: z.string().optional().describe("Prompt filename without .md extension"),
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
  ];
}
