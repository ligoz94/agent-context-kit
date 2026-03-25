/**
 * @agent-context-kit/toolshed-server — handlers
 *
 * Pure handler functions, decoupled from the MCP server transport.
 * Accepts manifest + root as dependencies so they are fully testable
 * without spawning a real server process.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: true;
}

export type Manifest = Record<string, unknown>;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function readFile(root: string, relativePath: string): string | null {
  if (!relativePath) return null;
  const abs = resolve(root, relativePath);
  if (!existsSync(abs)) return null;
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

export function readDir(root: string, relativePath: string): Record<string, string> {
  const abs = resolve(root, relativePath);
  if (!existsSync(abs)) return {};
  return Object.fromEntries(
    readdirSync(abs)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
      .map((f) => [f.replace(".md", ""), readFileSync(join(abs, f), "utf8")]),
  );
}

export function toolName(manifest: Manifest, canonical: string): string {
  const toolshed = manifest?.toolshed as { tool_aliases?: Record<string, string> } | undefined;
  return toolshed?.tool_aliases?.[canonical] ?? canonical;
}

export function ok(content: string): ToolResult {
  return { content: [{ type: "text", text: content }] };
}

export function err(msg: string): ToolResult {
  return {
    content: [{ type: "text", text: `[toolshed error] ${msg}` }],
    isError: true,
  };
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export function handleGetProjectIdentity(manifest: Manifest, root: string): ToolResult {
  const parts: string[] = [];
  const id = manifest?.identity as
    | { values?: string; architecture?: string; glossary?: string }
    | undefined;

  const values = readFile(root, id?.values ?? "");
  if (values) parts.push(`## Values\n\n${values}`);

  const arch = readFile(root, id?.architecture ?? "");
  if (arch) parts.push(`## Architecture primer\n\n${arch}`);

  const glossary = readFile(root, id?.glossary ?? "");
  if (glossary) parts.push(`## Glossary\n\n${glossary}`);

  if (parts.length === 0) return err("No identity files found. Check manifest.yaml [identity].");
  return ok(parts.join("\n\n---\n\n"));
}

export function handleGetRules(
  manifest: Manifest,
  root: string,
  input: { standard?: string },
): ToolResult {
  const parts: string[] = [];

  const rules = manifest?.rules as
    | { policy?: string; standards?: { name: string; path: string }[] }
    | undefined;

  const policy = readFile(root, rules?.policy ?? "");
  if (policy) parts.push(`## Context policy\n\n${policy}`);

  const standards = rules?.standards ?? [];
  for (const s of standards) {
    if (input.standard && s.name !== input.standard) continue;
    const content = readFile(root, s.path);
    if (content) parts.push(`## Standard: ${s.name}\n\n${content}`);
  }

  if (parts.length === 0) return err("No rules found. Check manifest.yaml [rules].");
  return ok(parts.join("\n\n---\n\n"));
}

export function handleGetLearnings(manifest: Manifest, root: string): ToolResult {
  const knowledge = manifest?.knowledge as { learnings?: string } | undefined;
  const content = readFile(root, knowledge?.learnings ?? "");
  if (!content)
    return err("key-learnings.md not found. Check manifest.yaml [knowledge.learnings].");
  return ok(content);
}

export function handleGetSpec(
  manifest: Manifest,
  root: string,
  input: { name?: string },
): ToolResult {
  const registry =
    (manifest?.registry as { name: string; path: string; status?: string }[]) ?? [];
  const entry = registry.find((r) => r.name === input?.name);
  if (!entry) {
    const names = registry.map((r) => r.name).join(", ");
    return err(`Feature "${input?.name}" not found. Available: ${names || "none"}`);
  }
  const content = readFile(root, entry.path);
  if (!content) return err(`Spec file not found: ${entry.path}`);
  return ok(`# Spec: ${entry.name}\nStatus: ${entry.status ?? "unknown"}\n\n${content}`);
}

export function handleListRegistry(manifest: Manifest): ToolResult {
  const registry =
    (manifest?.registry as { name: string; path: string; status?: string }[]) ?? [];
  if (registry.length === 0)
    return ok("Registry is empty. Add entries to manifest.yaml [registry].");
  const lines = registry.map((r) => `- **${r.name}** (${r.status ?? "unknown"}): ${r.path}`);
  return ok(`## Feature registry\n\n${lines.join("\n")}`);
}

export function handleLookupGlossary(
  manifest: Manifest,
  root: string,
  input: { term?: string },
): ToolResult {
  const id = manifest?.identity as { glossary?: string } | undefined;
  const content = readFile(root, id?.glossary ?? "");
  if (!content) return err("Glossary not found.");
  const term = String(input?.term ?? "").toLowerCase();
  const lines = content.split("\n").filter((l) => l.toLowerCase().includes(term));
  if (lines.length === 0) return ok(`Term "${input?.term}" not found in glossary.`);
  return ok(`## Glossary: ${input?.term}\n\n${lines.join("\n")}`);
}

export function handleGetPrompt(
  manifest: Manifest,
  root: string,
  input: { name?: string },
): ToolResult {
  const prompts = manifest?.prompts as { dir?: string } | undefined;
  const dir = prompts?.dir ?? "docs/agent/prompts";
  const content = readFile(root, join(dir, `${input?.name}.md`));
  if (!content) return err(`Prompt "${input?.name}" not found in ${dir}`);
  return ok(content);
}

export function handleListPrompts(manifest: Manifest, root: string): ToolResult {
  const prompts = manifest?.prompts as { dir?: string } | undefined;
  const dir = prompts?.dir ?? "docs/agent/prompts";
  const files = readDir(root, dir);
  const names = Object.keys(files);
  if (names.length === 0) return ok("No prompts found.");
  return ok(`## Available prompts\n\n${names.map((n) => `- ${n}`).join("\n")}`);
}
