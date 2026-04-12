/**
 * @agent-context-kit/toolshed-server — handlers
 *
 * Pure handler functions, decoupled from the MCP server transport.
 * Accepts manifest + root as dependencies so they are fully testable
 * without spawning a real server process.
 */

import { readFileSync, existsSync, readdirSync, writeFileSync, appendFileSync, statSync } from "fs";
import { resolve, join } from "path";
import { execSync } from "child_process";

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

export function appendFile(root: string, relativePath: string, content: string): boolean {
  if (!relativePath) return false;
  const abs = resolve(root, relativePath);
  if (!existsSync(abs)) return false;
  try {
    appendFileSync(abs, "\n" + content + "\n", "utf8");
    return true;
  } catch {
    return false;
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
  const id = manifest?.identity as any;

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
  const rules = manifest?.rules as any;

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
  const knowledge = manifest?.knowledge as any;
  const content = readFile(root, knowledge?.learnings ?? "");
  if (!content)
    return err("key-learnings.md not found. Check manifest.yaml [knowledge.learnings].");
  return ok(content);
}

export function handleAddLearning(manifest: Manifest, root: string, input: { learning?: string }): ToolResult {
  const knowledge = manifest?.knowledge as any;
  if (!knowledge?.learnings) return err("key-learnings.md not found in manifest.");
  if (!input.learning) return err("No learning provided.");
  
  const success = appendFile(root, knowledge.learnings, `- ${input.learning}`);
  if (!success) return err(`Failed to write to ${knowledge.learnings}. Check if the file exists.`);
  
  return ok(`Successfully added learning to ${knowledge.learnings}`);
}

export function handleGetSpec(
  manifest: Manifest,
  root: string,
  input: { name?: string },
): ToolResult {
  const registry = (manifest?.registry as any[]) ?? [];
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
  const registry = (manifest?.registry as any[]) ?? [];
  if (registry.length === 0)
    return ok("Registry is empty. Add entries to manifest.yaml [registry].");
  const lines = registry.map((r) => `- **${r.name}** (${r.status ?? "unknown"}): ${r.path}`);
  return ok(`## Feature registry\n\n${lines.join("\n")}`);
}

export function handleUpdateFeatureStatus(manifestPath: string, input: { name?: string, status?: string }): ToolResult {
  if (!input.name || !input.status) return err("Name and status are required.");
  if (!existsSync(manifestPath)) return err(`Manifest not found at ${manifestPath}`);
  
  try {
    let raw = readFileSync(manifestPath, "utf8");
    const escapedName = input.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(name:\\s*['"]?${escapedName}['"]?[\\s\\S]*?status:\\s*)[^\\n]+`, 'm');
    
    if (regex.test(raw)) {
      raw = raw.replace(regex, `$1${input.status}`);
      writeFileSync(manifestPath, raw, "utf8");
      return ok(`Successfully updated status of "${input.name}" to "${input.status}".`);
    } else {
      return err(`Could not find status field for feature "${input.name}" to update. Ensure the feature has a status field in manifest.yaml.`);
    }
  } catch (e) {
    return err(`Failed to update manifest: ${(e as Error).message}`);
  }
}

export function handleLookupGlossary(
  manifest: Manifest,
  root: string,
  input: { term?: string },
): ToolResult {
  const id = manifest?.identity as any;
  const content = readFile(root, id?.glossary ?? "");
  if (!content) return err("Glossary not found.");
  
  const term = String(input?.term ?? "").toLowerCase();
  const lines = content.split("\n");
  
  let result = "";
  let insideMatch = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#")) {
      if (line.toLowerCase().includes(term)) {
        insideMatch = true;
        result += line + "\n";
      } else {
        if (insideMatch) break;
      }
    } else {
      if (insideMatch) {
         result += line + "\n";
      } else if (line.toLowerCase().includes(term)) {
         const start = Math.max(0, i - 1);
         const end = Math.min(lines.length - 1, i + 1);
         return ok(`## Glossary snippet:\n\n${lines.slice(start, end + 1).join("\n")}`);
      }
    }
  }
  
  if (result) return ok(result.trim());
  return ok(`Term "${input?.term}" not found in glossary.`);
}

export function handleAddGlossaryTerm(manifest: Manifest, root: string, input: { term?: string, definition?: string }): ToolResult {
  const id = manifest?.identity as any;
  if (!id?.glossary) return err("Glossary not found in manifest.");
  if (!input.term || !input.definition) return err("Term and definition are required.");
  
  const success = appendFile(root, id.glossary, `### ${input.term}\n${input.definition}\n`);
  if (!success) return err(`Failed to write to ${id.glossary}`);
  
  return ok(`Successfully added term "${input.term}" to glossary.`);
}

export function handleGetPrompt(
  manifest: Manifest,
  root: string,
  input: { name?: string, variables?: Record<string, string> },
): ToolResult {
  const prompts = manifest?.prompts as any;
  const dir = prompts?.dir ?? "docs/agent/prompts";
  let content = readFile(root, join(dir, `${input?.name}.md`));
  if (!content) return err(`Prompt "${input?.name}" not found in ${dir}`);
  
  if (input.variables) {
    for (const [k, v] of Object.entries(input.variables)) {
      content = content.replaceAll(`{{${k}}}`, v);
    }
  }
  
  return ok(content);
}

export function handleListPrompts(manifest: Manifest, root: string): ToolResult {
  const prompts = manifest?.prompts as any;
  const dir = prompts?.dir ?? "docs/agent/prompts";
  const files = readDir(root, dir);
  const names = Object.keys(files);
  if (names.length === 0) return ok("No prompts found.");
  return ok(`## Available prompts\n\n${names.map((n) => `- ${n}`).join("\n")}`);
}

export function handleSearchContext(manifest: Manifest, root: string, input: { query?: string }): ToolResult {
  if (!input.query) return err("Query is required.");
  const filesToSearch: string[] = [];
  const id = manifest?.identity as any;
  if (id?.values) filesToSearch.push(id.values);
  if (id?.architecture) filesToSearch.push(id.architecture);
  if (id?.glossary) filesToSearch.push(id.glossary);
  
  const rules = manifest?.rules as any;
  if (rules?.policy) filesToSearch.push(rules.policy);
  if (rules?.standards) rules.standards.forEach((s: any) => filesToSearch.push(s.path));
  
  const knowledge = manifest?.knowledge as any;
  if (knowledge?.learnings) filesToSearch.push(knowledge.learnings);
  
  const registry = manifest?.registry as any;
  if (registry) registry.forEach((r: any) => filesToSearch.push(r.path));
  
  const results: string[] = [];
  const queryLower = input.query.toLowerCase();
  
  for (const relPath of Array.from(new Set(filesToSearch.filter(Boolean)))) {
    const abs = resolve(root, relPath);
    if (!existsSync(abs)) continue;
    try {
      const content = readFileSync(abs, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(queryLower)) {
          const start = Math.max(0, i - 1);
          const end = Math.min(lines.length - 1, i + 1);
          const snippet = lines.slice(start, end + 1).join("\n");
          results.push(`## Match in ${relPath} (Line ${i + 1})\n\`\`\`\n${snippet}\n\`\`\``);
        }
      }
    } catch {
      // ignore
    }
  }
  
  if (results.length === 0) return ok(`No matches found for "${input.query}".`);
  if (results.length > 20) return ok(results.slice(0, 20).join("\n\n") + `\n\n...and ${results.length - 20} more matches.`);
  return ok(results.join("\n\n"));
}

export function handleValidateContext(manifest: Manifest, root: string): ToolResult {
  const missing: string[] = [];
  const check = (rel?: string) => {
    if (rel && !existsSync(resolve(root, rel))) missing.push(rel);
  };
  
  const id = manifest?.identity as any;
  check(id?.values);
  check(id?.architecture);
  check(id?.glossary);
  
  const rules = manifest?.rules as any;
  check(rules?.policy);
  (rules?.standards || []).forEach((s: any) => check(s.path));
  
  const knowledge = manifest?.knowledge as any;
  check(knowledge?.learnings);
  
  (manifest?.registry as any || []).forEach((r: any) => check(r.path));
  
  if (manifest?.templates) {
    const templates = manifest.templates as any;
    check(templates?.dir ?? "docs/agent/templates");
  }
  
  if (missing.length === 0) return ok("All context files are present and valid.");
  return err(`Missing context files or directories:\n${missing.map(m => `- ${m}`).join("\n")}`);
}

export function handleGetTemplate(
  manifest: Manifest,
  root: string,
  input: { name?: string },
): ToolResult {
  const templates = manifest?.templates as any;
  const dir = templates?.dir ?? "docs/agent/templates";
  let content = readFile(root, join(dir, `${input?.name}.md`));
  if (!content) return err(`Template "${input?.name}" not found in ${dir}`);
  
  return ok(content);
}

export function handleListTemplates(manifest: Manifest, root: string): ToolResult {
  const templates = manifest?.templates as any;
  const dir = templates?.dir ?? "docs/agent/templates";
  const files = readDir(root, dir);
  const names = Object.keys(files);
  if (names.length === 0) return ok(`No templates found in ${dir}.`);
  return ok(`## Available templates\n\n${names.map((n) => `- ${n}`).join("\n")}`);
}

export function handleValidateAgentReport(input: { pr_body?: string }): ToolResult {
  if (!input.pr_body) return err("pr_body is required.");
  
  const text = input.pr_body;
  const missing: string[] = [];
  
  const reportRegexes = [
    { name: "Clarifications requested", regex: /-\s+\*\*Clarifications requested:\*\*\s+.+/i },
    { name: "Assumptions made", regex: /-\s+\*\*Assumptions made:\*\*\s+.+/i },
    { name: "Spec gaps found", regex: /-\s+\*\*Spec gaps found:\*\*\s+.+/i },
    { name: "Scope", regex: /-\s+\*\*Scope:\*\*\s+.+/i },
    { name: "Refusals", regex: /-\s+\*\*Refusals:\*\*\s+.+/i },
    { name: "Inferences", regex: /-\s+\*\*Inferences:\*\*\s+.+/i },
    { name: "Context mistakes", regex: /-\s+\*\*Context mistakes:\*\*\s+.+/i },
  ];
  
  for (const r of reportRegexes) {
    if (!r.regex.test(text)) missing.push(`Missing or incomplete Agent Report field: '${r.name}'`);
  }
  
  const agentIdRegex = /\*\*Agent:\*\*\s+[^·]+·\s+`[^`]+`\s+·\s+effort=(none|low|medium|high|n\/a|unknown)/;
  if (!agentIdRegex.test(text)) {
    missing.push("Missing or malformed Agent Identification string (expected format: **Agent:** <tool> · `<model-id>` · effort=<effort>)");
  }
  
  if (missing.length > 0) {
    return err(`PR Body Validation Failed:\n${missing.map(m => `- ${m}`).join("\n")}`);
  }
  
  return ok("✅ PR Body is valid and conforms to the PNA standards.");
}

export function handleAnalyzeSpecCompleteness(root: string, input: { path?: string }): ToolResult {
  if (!input.path) return err("path is required.");
  
  const content = readFile(root, input.path);
  if (!content) return err(`Spec file not found or unreadable: ${input.path}`);
  
  const missing: string[] = [];
  
  const sections = [
    "Objective",
    "Constraints",
    "Non-goals",
    "Data inputs",
    "Data outputs",
    "Failure states",
    "Security boundaries",
    "Acceptance criteria"
  ];
  
  for (const section of sections) {
    const regex = new RegExp(`(^|\\n)(#+\\s+|\\*\\*)?${section}(:|\\*\\*|\\n|\\s)`, "i");
    if (!regex.test(content)) {
      missing.push(section);
    }
  }
  
  if (missing.length > 0) {
    return err(`Spec is INCOMPLETE. Missing required intent engineering categories:\n${missing.map(m => `- [ ] ${m}`).join("\n")}`);
  }
  
  return ok(`✅ Spec is complete. All 8 Intent Engineering categories are present.`);
}

// ── Guardrails Handlers ───────────────────────────────────────────────────────

export function handleGetGuardrails(manifest: Manifest): ToolResult {
  const g = manifest?.guardrails as any;

  if (!g || (!g.blocked_actions?.length && !g.require_approval?.length && !g.allowed_domains?.length)) {
    return ok(
      "## Guardrails\n\nNo guardrails configured. " +
      "Add a `guardrails` section to manifest.yaml to constrain agent behavior."
    );
  }

  const parts: string[] = ["## Guardrails\n"];

  if (g.blocked_actions?.length) {
    parts.push(
      "### 🚫 Blocked Actions (NEVER perform these)\n" +
      "The following actions are strictly prohibited. Refuse them unconditionally:\n\n" +
      g.blocked_actions.map((a: string) => `- \`${a}\``).join("\n")
    );
  }

  if (g.require_approval?.length) {
    parts.push(
      "### ⚠️ Requires Human Approval (call `request_human_approval` first)\n" +
      "Before performing any of the following, you MUST call the `request_human_approval` tool " +
      "and wait for explicit confirmation:\n\n" +
      g.require_approval.map((a: string) => `- \`${a}\``).join("\n")
    );
  }

  if (g.allowed_domains?.length) {
    parts.push(
      "### 🌐 Allowed Domains\n" +
      "Browser interactions are permitted only on these domains:\n\n" +
      g.allowed_domains.map((d: string) => `- \`${d}\``).join("\n")
    );
  }

  return ok(parts.join("\n\n---\n\n"));
}

export interface ApprovalInput {
  action: string;
  context: string;
  risk_level?: "low" | "medium" | "high";
}

export function handleRequestHumanApproval(input: ApprovalInput): ToolResult {
  if (!input.action) return err("'action' is required.");
  if (!input.context) return err("'context' is required.");

  const riskLevel = input.risk_level ?? "medium";
  const riskEmoji = { low: "🟡", medium: "🟠", high: "🔴" }[riskLevel];
  const riskLabel = riskLevel.toUpperCase();

  const summary = [
    `## 🛑 Human Approval Required`,
    ``,
    `${riskEmoji} **Risk Level:** ${riskLabel}`,
    ``,
    `**Action the agent wants to perform:**`,
    `> ${input.action}`,
    ``,
    `**Context / Reason:**`,
    `> ${input.context}`,
    ``,
    `---`,
    `**To proceed:** Reply with \`APPROVED\` or describe the correction needed.`,
    `**To cancel:** Reply with \`DENIED\` and optionally explain why.`,
    ``,
    `_The agent will not proceed until it receives explicit approval._`,
  ].join("\n");

  return ok(summary);
}

export interface VerifyCheck {
  type: "file_exists" | "file_contains" | "file_modified_after" | "command_succeeds" | "http_status" | "json_contains";
  path?: string;
  command?: string;
  expected_status?: number;
  json_path?: string;
  value?: string;
  after?: string; // ISO 8601 timestamp
}

export interface VerifyActionInput {
  description: string;
  checks: VerifyCheck[];
}

export async function handleVerifyAction(root: string, input: VerifyActionInput): Promise<ToolResult> {
  if (!input.description) return err("'description' is required.");
  if (!input.checks?.length) return err("At least one check is required.");

  const results: { check: VerifyCheck; passed: boolean; detail: string }[] = [];

  for (const check of input.checks) {
    if (check.type === "command_succeeds") {
      if (!check.command) {
        results.push({ check, passed: false, detail: "`command` is required for command_succeeds check." });
        continue;
      }
      try {
        execSync(check.command, { cwd: root, stdio: "ignore", timeout: 15000 });
        results.push({ check, passed: true, detail: `Command \`${check.command}\` succeeded.` });
      } catch (e) {
        results.push({ check, passed: false, detail: `Command \`${check.command}\` failed.` });
      }
      continue;
    }

    if (check.type === "http_status") {
      if (!check.path) {
        results.push({ check, passed: false, detail: "`path` (URL) is required for http_status check." });
        continue;
      }
      if (!check.expected_status) {
        results.push({ check, passed: false, detail: "`expected_status` is required for http_status check." });
        continue;
      }
      try {
        const res = await fetch(check.path);
        const passed = res.status === check.expected_status;
        results.push({
          check,
          passed,
          detail: passed
            ? `URL \`${check.path}\` returned status ${res.status}.`
            : `URL \`${check.path}\` returned status ${res.status}, expected ${check.expected_status}.`,
        });
      } catch (e) {
        results.push({ check, passed: false, detail: `Failed to fetch \`${check.path}\`: ${(e as Error).message}` });
      }
      continue;
    }

    if (!check.path) {
      results.push({ check, passed: false, detail: "`path` is required for file-based checks." });
      continue;
    }

    const abs = resolve(root, check.path);

    if (check.type === "file_exists") {
      const passed = existsSync(abs);
      results.push({
        check,
        passed,
        detail: passed ? `File exists at \`${check.path}\`` : `File NOT found: \`${check.path}\``,
      });
      continue;
    }

    if (!existsSync(abs)) {
      results.push({ check, passed: false, detail: `File NOT found: \`${check.path}\`` });
      continue;
    }

    if (check.type === "file_contains") {
      if (!check.value) {
        results.push({ check, passed: false, detail: "`value` is required for file_contains check." });
        continue;
      }
      try {
        const content = readFileSync(abs, "utf8");
        const passed = content.includes(check.value);
        results.push({
          check,
          passed,
          detail: passed
            ? `File \`${check.path}\` contains the expected string.`
            : `File \`${check.path}\` does NOT contain: "${check.value}"`,
        });
      } catch {
        results.push({ check, passed: false, detail: `Could not read \`${check.path}\`.` });
      }
      continue;
    }

    if (check.type === "file_modified_after") {
      if (!check.after) {
        results.push({ check, passed: false, detail: "`after` (ISO timestamp) is required for file_modified_after check." });
        continue;
      }
      try {
        const stat = statSync(abs);
        const modifiedAt = stat.mtime;
        const afterDate = new Date(check.after);
        const passed = modifiedAt > afterDate;
        results.push({
          check,
          passed,
          detail: passed
            ? `File \`${check.path}\` was modified at ${modifiedAt.toISOString()} (after ${check.after}).`
            : `File \`${check.path}\` was last modified at ${modifiedAt.toISOString()}, which is NOT after ${check.after}.`,
        });
      } catch {
        results.push({ check, passed: false, detail: `Could not stat \`${check.path}\`.` });
      }
      continue;
    }

    if (check.type === "json_contains") {
      if (!check.json_path || !check.value) {
        results.push({ check, passed: false, detail: "`json_path` and `value` are required for json_contains check." });
        continue;
      }
      try {
        const content = readFileSync(abs, "utf8");
        const parsed = JSON.parse(content);
        const keys = check.json_path.split(".");
        let current = parsed;
        for (const k of keys) {
          if (current && typeof current === "object" && k in current) {
            current = current[k];
          } else {
            current = undefined;
            break;
          }
        }
        const passed = String(current) === check.value;
        results.push({
          check,
          passed,
          detail: passed
            ? `JSON path \`${check.json_path}\` in \`${check.path}\` matches "${check.value}".`
            : `JSON path \`${check.json_path}\` in \`${check.path}\` is "${current}", expected "${check.value}".`,
        });
      } catch (e) {
        results.push({ check, passed: false, detail: `Could not process JSON in \`${check.path}\`: ${(e as Error).message}` });
      }
      continue;
    }

    results.push({ check, passed: false, detail: `Unknown check type: "${(check as any).type}"` });
  }

  const allPassed = results.every((r) => r.passed);
  const passCount = results.filter((r) => r.passed).length;

  const lines = [
    `## Verification: ${input.description}`,
    ``,
    `**Result:** ${allPassed ? "✅ ALL CHECKS PASSED" : `❌ ${results.length - passCount} of ${results.length} checks FAILED`}`,
    ``,
    ...results.map((r) => `- ${r.passed ? "✅" : "❌"} [${r.check.type}] ${r.detail}`),
  ];

  return allPassed ? ok(lines.join("\n")) : err(lines.join("\n"));
}

