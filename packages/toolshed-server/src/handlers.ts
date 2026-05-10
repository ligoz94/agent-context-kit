/**
 * @agent-context-kit/toolshed-server — handlers
 *
 * Pure handler functions, decoupled from the MCP server transport.
 * Accepts manifest + root as dependencies so they are fully testable
 * without spawning a real server process.
 */

import {
  readFileSync,
  existsSync,
  readdirSync,
  writeFileSync,
  appendFileSync,
  statSync,
  mkdirSync,
} from "fs";
import { resolve, join } from "path";
import { execSync } from "child_process";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: true;
}

export type Manifest = Record<string, unknown>;

export interface MissionValidationAssertion {
  id: string;
  title: string;
  type: "scrutiny" | "behavioral" | "manual";
  description?: string;
}

export interface MissionSourceIssue {
  number: number;
  title: string;
  body?: string;
  repo?: string;
  url?: string;
}

export interface MissionSlice {
  id: string;
  title: string;
  kind: "plan" | "implement" | "validate" | "repair";
  status: "planned" | "in_progress" | "blocked" | "completed";
  summary?: string;
  dependsOn?: string[];
}

export interface MissionPlan {
  summary: string;
  slices: MissionSlice[];
}

export interface MissionHandoffCommand {
  command: string;
  exitCode: number;
}

export interface MissionHandoff {
  runId: string;
  role: "orchestrator" | "worker" | "validator";
  status: "completed" | "completed_with_findings" | "failed";
  summary: string;
  filesTouched?: string[];
  commands?: MissionHandoffCommand[];
  issues?: string[];
  nextSuggestedAction?: string;
}

export interface MissionEvent {
  timestamp: string;
  type: string;
  message: string;
}

export interface MissionFinding {
  id: string;
  validator: "scrutiny" | "behavioral" | "review";
  severity: "low" | "medium" | "high";
  summary: string;
  details?: string;
  relatedSliceId?: string;
  status: "open" | "accepted" | "resolved";
}

export interface MissionValidatorResult {
  runId: string;
  validator: "scrutiny" | "behavioral" | "review";
  status: "passed" | "failed";
  summary: string;
  findings: Array<Omit<MissionFinding, "status" | "id"> & { id?: string }>;
}

export interface MissionState {
  id: string;
  goal: string;
  status: "planned" | "in_progress" | "blocked" | "completed";
  createdAt: string;
  updatedAt: string;
  sourceIssue?: MissionSourceIssue;
  plan: MissionPlan;
  validationContract: MissionValidationAssertion[];
  handoffs: MissionHandoff[];
  events: MissionEvent[];
  findings: MissionFinding[];
}

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

function missionConfig(manifest: Manifest): {
  stateDir: string;
  assertions: MissionValidationAssertion[];
} {
  const mission = manifest?.mission as any;
  return {
    stateDir: mission?.state_dir ?? ".agent-context-kit/missions",
    assertions: mission?.validation_contract?.assertions ?? [],
  };
}

function missionDir(root: string, manifest: Manifest): string {
  return resolve(root, missionConfig(manifest).stateDir);
}

function missionFilePath(root: string, manifest: Manifest, missionId: string): string {
  return join(missionDir(root, manifest), `${missionId}.json`);
}

function generateMissionId(goal: string): string {
  const slug =
    goal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "mission";
  return `${slug}-${Date.now()}`;
}

function readMissionState(
  root: string,
  manifest: Manifest,
  missionId?: string,
): MissionState | null {
  const dir = missionDir(root, manifest);
  if (!existsSync(dir)) return null;

  let selectedId = missionId;
  if (!selectedId) {
    const candidates = readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .sort(
        (left, right) => statSync(join(dir, right)).mtimeMs - statSync(join(dir, left)).mtimeMs,
      );
    selectedId = candidates[0]?.replace(/\.json$/, "");
  }

  if (!selectedId) return null;
  const filePath = missionFilePath(root, manifest, selectedId);
  if (!existsSync(filePath)) return null;

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as MissionState;
  } catch {
    return null;
  }
}

function validateMissionHandoff(handoff: MissionHandoff): string[] {
  const issues: string[] = [];
  if (!handoff.runId) issues.push("handoff.runId is required.");
  if (!handoff.role) issues.push("handoff.role is required.");
  if (!handoff.status) issues.push("handoff.status is required.");
  if (!handoff.summary) issues.push("handoff.summary is required.");
  return issues;
}

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractTaskLines(text: string): string[] {
  const lines = normalizeLines(text);
  const bulletLines = lines
    .map((line) => line.match(/^[-*]\s+(.*)$/)?.[1] ?? line.match(/^\d+\.\s+(.*)$/)?.[1])
    .filter((line): line is string => Boolean(line));
  if (bulletLines.length > 0) return bulletLines.slice(0, 5);

  return text
    .split(/[.!?]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12)
    .slice(0, 3);
}

function createDefaultPlan(goal: string): MissionPlan {
  return {
    summary: `Plan derived from goal: ${goal}`,
    slices: [
      {
        id: "slice-1-plan",
        title: `Clarify implementation scope for ${goal}`,
        kind: "plan",
        status: "planned",
      },
      {
        id: "slice-2-implement",
        title: `Implement core work for ${goal}`,
        kind: "implement",
        status: "planned",
        dependsOn: ["slice-1-plan"],
      },
      {
        id: "slice-3-validate",
        title: `Validate and record results for ${goal}`,
        kind: "validate",
        status: "planned",
        dependsOn: ["slice-2-implement"],
      },
    ],
  };
}

function createPlanFromGoal(goal: string, issue?: MissionSourceIssue): MissionPlan {
  const sourceText = issue ? `${issue.title}\n${issue.body ?? ""}` : goal;
  const tasks = extractTaskLines(sourceText);
  if (tasks.length < 2) return createDefaultPlan(goal);

  return {
    summary: issue
      ? `Plan derived from GitHub issue #${issue.number}: ${issue.title}`
      : `Plan derived from goal: ${goal}`,
    slices: tasks.map((task, index) => ({
      id: `slice-${index + 1}`,
      title: task,
      kind: index === tasks.length - 1 ? "validate" : "implement",
      status: "planned",
      dependsOn: index > 0 ? [`slice-${index}`] : undefined,
    })),
  };
}

function missionHasOpenFindings(state: MissionState): boolean {
  return state.findings.some((finding) => finding.status === "open");
}

function missionDependenciesSatisfied(state: MissionState, slice: MissionSlice): boolean {
  const dependencies = slice.dependsOn ?? [];
  return dependencies.every((dependencyId) => {
    const dependency = state.plan.slices.find((candidate) => candidate.id === dependencyId);
    return dependency?.status === "completed";
  });
}

function nextRunnableMissionSlice(state: MissionState): MissionSlice | undefined {
  return state.plan.slices.find(
    (slice) => slice.status === "planned" && missionDependenciesSatisfied(state, slice),
  );
}

function addMissionEvent(state: MissionState, type: string, message: string): void {
  const timestamp = new Date().toISOString();
  state.events.push({ timestamp, type, message });
  state.updatedAt = timestamp;
}

function markMissionCompleted(state: MissionState): boolean {
  if (
    state.plan.slices.every((slice) => slice.status === "completed") &&
    !missionHasOpenFindings(state)
  ) {
    state.status = "completed";
    addMissionEvent(state, "mission.completed", `Mission completed for goal: ${state.goal}`);
    return true;
  }

  return false;
}

function addRepairAndRevalidateSlices(
  state: MissionState,
  findings: MissionFinding[],
  validateSliceId: string,
  runId: string,
): void {
  const existingIds = new Set(state.plan.slices.map((slice) => slice.id));
  const repairIds: string[] = [];

  for (const finding of findings) {
    const repairId = `${finding.id}-repair`;
    repairIds.push(repairId);
    if (existingIds.has(repairId)) continue;

    state.plan.slices.push({
      id: repairId,
      title: `Repair: ${finding.summary}`,
      kind: "repair",
      status: "planned",
      summary: finding.details,
      dependsOn: finding.relatedSliceId ? [finding.relatedSliceId] : [validateSliceId],
    });
    existingIds.add(repairId);
  }

  if (repairIds.length === 0) return;

  const followupId = `${runId}-revalidate`;
  if (existingIds.has(followupId)) return;
  state.plan.slices.push({
    id: followupId,
    title: "Re-validate after repairs",
    kind: "validate",
    status: "planned",
    dependsOn: repairIds,
  });
}

function createValidationAssertions(
  goal: string,
  issue?: MissionSourceIssue,
): MissionValidationAssertion[] {
  const sourceText = issue ? `${issue.title}\n${issue.body ?? ""}` : goal;
  const explicitAssertions = normalizeLines(sourceText)
    .filter((line) => /should|must|acceptance|criteria|verify|validation/i.test(line))
    .slice(0, 4)
    .map((line, index) => ({
      id: `vc-${index + 1}`,
      title: line.slice(0, 80),
      type: /ui|page|render|click|browser/i.test(line)
        ? ("behavioral" as const)
        : ("scrutiny" as const),
      description: line,
    }));

  if (explicitAssertions.length > 0) return explicitAssertions;
  return [
    {
      id: "vc-1",
      title: "mission-state-persists",
      type: "scrutiny",
      description: "The mission state must persist the plan, findings, and handoffs for this task.",
    },
    {
      id: "vc-2",
      title: "primary-request-is-validated",
      type: "behavioral",
      description: `The primary requested outcome for \"${goal}\" must be validated independently of implementation decisions.`,
    },
  ];
}

function fetchGitHubIssue(issueNumber: number, repo?: string): MissionSourceIssue {
  const repoArg = repo ? ` --repo ${JSON.stringify(repo)}` : "";
  const command = `gh issue view ${issueNumber}${repoArg} --json number,title,body,url`;
  const raw = execSync(command, { encoding: "utf8" }).trim();
  const parsed = JSON.parse(raw) as { number: number; title: string; body?: string; url?: string };
  return {
    number: parsed.number,
    title: parsed.title,
    body: parsed.body,
    repo,
    url: parsed.url,
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

export function handleAddLearning(
  manifest: Manifest,
  root: string,
  input: { learning?: string },
): ToolResult {
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

export function handleUpdateFeatureStatus(
  manifestPath: string,
  input: { name?: string; status?: string },
): ToolResult {
  if (!input.name || !input.status) return err("Name and status are required.");
  if (!existsSync(manifestPath)) return err(`Manifest not found at ${manifestPath}`);

  try {
    let raw = readFileSync(manifestPath, "utf8");
    const escapedName = input.name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(
      `(name:\\s*['"]?${escapedName}['"]?[\\s\\S]*?status:\\s*)[^\\n]+`,
      "m",
    );

    if (regex.test(raw)) {
      raw = raw.replace(regex, `$1${input.status}`);
      writeFileSync(manifestPath, raw, "utf8");
      return ok(`Successfully updated status of "${input.name}" to "${input.status}".`);
    } else {
      return err(
        `Could not find status field for feature "${input.name}" to update. Ensure the feature has a status field in manifest.yaml.`,
      );
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

export function handleAddGlossaryTerm(
  manifest: Manifest,
  root: string,
  input: { term?: string; definition?: string },
): ToolResult {
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
  input: { name?: string; variables?: Record<string, string> },
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

export function handleSearchContext(
  manifest: Manifest,
  root: string,
  input: { query?: string },
): ToolResult {
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
  if (results.length > 20)
    return ok(
      results.slice(0, 20).join("\n\n") + `\n\n...and ${results.length - 20} more matches.`,
    );
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

  ((manifest?.registry as any) || []).forEach((r: any) => check(r.path));

  if (manifest?.templates) {
    const templates = manifest.templates as any;
    check(templates?.dir ?? "docs/agent/templates");
  }

  if (missing.length === 0) return ok("All context files are present and valid.");
  return err(`Missing context files or directories:\n${missing.map((m) => `- ${m}`).join("\n")}`);
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

  const agentIdRegex =
    /\*\*Agent:\*\*\s+[^·]+·\s+`[^`]+`\s+·\s+effort=(none|low|medium|high|n\/a|unknown)/;
  if (!agentIdRegex.test(text)) {
    missing.push(
      "Missing or malformed Agent Identification string (expected format: **Agent:** <tool> · `<model-id>` · effort=<effort>)",
    );
  }

  if (missing.length > 0) {
    return err(`PR Body Validation Failed:\n${missing.map((m) => `- ${m}`).join("\n")}`);
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
    "Acceptance criteria",
  ];

  for (const section of sections) {
    const regex = new RegExp(`(^|\\n)(#+\\s+|\\*\\*)?${section}(:|\\*\\*|\\n|\\s)`, "i");
    if (!regex.test(content)) {
      missing.push(section);
    }
  }

  if (missing.length > 0) {
    return err(
      `Spec is INCOMPLETE. Missing required intent engineering categories:\n${missing.map((m) => `- [ ] ${m}`).join("\n")}`,
    );
  }

  return ok(`✅ Spec is complete. All 8 Intent Engineering categories are present.`);
}

export function handleCreateMission(
  manifest: Manifest,
  root: string,
  input: {
    goal?: string;
    mission_id?: string;
    validation_contract?: MissionValidationAssertion[];
    source_issue?: MissionSourceIssue;
  },
): ToolResult {
  if (!input.goal) return err("goal is required.");

  const missionId = input.mission_id ?? generateMissionId(input.goal);
  const filePath = missionFilePath(root, manifest, missionId);
  if (existsSync(filePath)) return err(`Mission \"${missionId}\" already exists.`);

  const dir = missionDir(root, manifest);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const now = new Date().toISOString();
  const configuredAssertions = missionConfig(manifest).assertions;
  const plan = createPlanFromGoal(input.goal, input.source_issue);
  const validationContract = input.validation_contract?.length
    ? input.validation_contract
    : configuredAssertions.length > 0
      ? configuredAssertions
      : createValidationAssertions(input.goal, input.source_issue);
  const state: MissionState = {
    id: missionId,
    goal: input.goal,
    status: "planned",
    createdAt: now,
    updatedAt: now,
    sourceIssue: input.source_issue,
    plan,
    validationContract,
    handoffs: [],
    events: [
      {
        timestamp: now,
        type: "mission.created",
        message: `Mission created for goal: ${input.goal}`,
      },
    ],
    findings: [],
  };

  writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");

  return ok(
    `## Mission Created\n\n- **ID:** ${state.id}\n- **Goal:** ${state.goal}\n- **State file:** ${filePath}\n- **Validation assertions:** ${state.validationContract.length}\n- **Planned slices:** ${state.plan.slices.length}`,
  );
}

export function handleCreateMissionFromIssue(
  manifest: Manifest,
  root: string,
  input: { issue_number?: number; repo?: string; mission_id?: string; goal_override?: string },
): ToolResult {
  if (!input.issue_number) return err("issue_number is required.");

  let issue: MissionSourceIssue;
  try {
    issue = fetchGitHubIssue(input.issue_number, input.repo);
  } catch (error) {
    return err(`Failed to fetch GitHub issue #${input.issue_number}: ${(error as Error).message}`);
  }

  const goal = input.goal_override ?? issue.title;
  const validationContract = createValidationAssertions(goal, issue);
  return handleCreateMission(manifest, root, {
    goal,
    mission_id: input.mission_id,
    validation_contract: validationContract,
    source_issue: issue,
  });
}

export function handleGetMissionState(
  manifest: Manifest,
  root: string,
  input: { mission_id?: string },
): ToolResult {
  const state = readMissionState(root, manifest, input.mission_id);
  if (!state)
    return err(`Mission state not found${input.mission_id ? ` for ${input.mission_id}` : ""}.`);
  return ok(JSON.stringify(state, null, 2));
}

export function handleSubmitMissionHandoff(
  manifest: Manifest,
  root: string,
  input: { mission_id?: string; handoff?: MissionHandoff },
): ToolResult {
  if (!input.handoff) return err("handoff is required.");

  const validationErrors = validateMissionHandoff(input.handoff);
  if (validationErrors.length > 0) return err(validationErrors.join("\n"));

  const state = readMissionState(root, manifest, input.mission_id);
  if (!state)
    return err(`Mission state not found${input.mission_id ? ` for ${input.mission_id}` : ""}.`);

  const now = new Date().toISOString();
  state.handoffs.push(input.handoff);
  state.updatedAt = now;
  state.status = input.handoff.status === "failed" ? "blocked" : "in_progress";
  state.events.push({
    timestamp: now,
    type: "mission.handoff_submitted",
    message: `${input.handoff.role} submitted handoff ${input.handoff.runId}`,
  });
  writeFileSync(missionFilePath(root, manifest, state.id), JSON.stringify(state, null, 2), "utf8");

  return ok(
    `## Mission Handoff Recorded\n\n- **Mission:** ${state.id}\n- **Run:** ${input.handoff.runId}\n- **Role:** ${input.handoff.role}\n- **Status:** ${input.handoff.status}`,
  );
}

export function handleListMissionEvents(
  manifest: Manifest,
  root: string,
  input: { mission_id?: string },
): ToolResult {
  const state = readMissionState(root, manifest, input.mission_id);
  if (!state)
    return err(`Mission state not found${input.mission_id ? ` for ${input.mission_id}` : ""}.`);
  if (state.events.length === 0) return ok(`No mission events recorded for ${state.id}.`);

  return ok(
    `## Mission Events\n\n${state.events
      .map((event) => `- ${event.timestamp} [${event.type}] ${event.message}`)
      .join("\n")}`,
  );
}

export function handleSubmitValidatorResult(
  manifest: Manifest,
  root: string,
  input: { mission_id?: string; result?: MissionValidatorResult },
): ToolResult {
  if (!input.result) return err("result is required.");

  const state = readMissionState(root, manifest, input.mission_id);
  if (!state)
    return err(`Mission state not found${input.mission_id ? ` for ${input.mission_id}` : ""}.`);

  const now = new Date().toISOString();
  const findings = input.result.findings.map((finding, index) => ({
    ...finding,
    id: finding.id || `${input.result!.runId}-finding-${index + 1}`,
    status: "open" as const,
  }));

  state.findings.push(...findings);
  state.updatedAt = now;
  state.events.push({
    timestamp: now,
    type: "mission.validator_result",
    message: `${input.result.validator} validator ${input.result.status}: ${input.result.summary}`,
  });

  if (input.result.status === "failed" && findings.length > 0) {
    const existingIds = new Set(state.plan.slices.map((slice) => slice.id));
    for (const finding of findings) {
      const repairId = `${finding.id}-repair`;
      if (existingIds.has(repairId)) continue;
      state.plan.slices.push({
        id: repairId,
        title: `Repair: ${finding.summary}`,
        kind: "repair",
        status: "planned",
        summary: finding.details,
        dependsOn: finding.relatedSliceId ? [finding.relatedSliceId] : undefined,
      });
    }
    state.status = "blocked";
  }

  writeFileSync(missionFilePath(root, manifest, state.id), JSON.stringify(state, null, 2), "utf8");

  return ok(
    `## Validator Result Recorded\n\n- **Mission:** ${state.id}\n- **Validator:** ${input.result.validator}\n- **Status:** ${input.result.status}\n- **Open findings added:** ${findings.length}`,
  );
}

export function handleRunMissionLoop(
  manifest: Manifest,
  root: string,
  input: {
    mission_id?: string;
    max_iterations?: number;
    validator?: "scrutiny" | "behavioral" | "review";
    simulate_findings?: string[];
  },
): ToolResult {
  const state = readMissionState(root, manifest, input.mission_id);
  if (!state)
    return err(`Mission state not found${input.mission_id ? ` for ${input.mission_id}` : ""}.`);

  const pendingFindings = [...(input.simulate_findings ?? [])];
  const maxIterations = input.max_iterations ?? 20;
  const validator = input.validator ?? "scrutiny";
  let injectedFindings = false;
  let iterations = 0;
  let reason: "completed" | "blocked" | "max_iterations" | "no_runnable_slice" = "max_iterations";

  while (iterations < maxIterations) {
    if (markMissionCompleted(state)) {
      reason = "completed";
      break;
    }

    const slice = nextRunnableMissionSlice(state);
    if (!slice) {
      state.status = missionHasOpenFindings(state) ? "blocked" : state.status;
      reason = missionHasOpenFindings(state) ? "blocked" : "no_runnable_slice";
      break;
    }

    iterations += 1;
    slice.status = "in_progress";
    state.status = "in_progress";
    addMissionEvent(
      state,
      "mission.slice_started",
      `Starting ${slice.kind} slice ${slice.id}: ${slice.title}`,
    );

    if (slice.kind === "validate") {
      const failedChecks = !injectedFindings ? pendingFindings.splice(0) : [];
      injectedFindings = true;
      const runId = `${state.id}-${slice.id}-${Date.now()}`;
      const findings: MissionFinding[] = failedChecks.map((check, index) => ({
        id: `${runId}-finding-${index + 1}`,
        validator,
        severity: validator === "behavioral" ? "high" : "medium",
        summary: check,
        details:
          failedChecks.length > 0
            ? `Auto-validator found ${failedChecks.length} issue(s)`
            : undefined,
        relatedSliceId: slice.dependsOn?.[0],
        status: "open",
      }));

      state.handoffs.push({
        runId,
        role: "validator",
        status: findings.length > 0 ? "completed_with_findings" : "completed",
        summary:
          findings.length > 0
            ? `Auto-validator found ${findings.length} issue(s)`
            : "Auto-validator passed",
        issues: findings.map((finding) => finding.summary),
      });
      slice.status = "completed";
      addMissionEvent(
        state,
        "mission.slice_completed",
        `Completed validate slice ${slice.id}: ${slice.title}`,
      );

      if (findings.length > 0) {
        state.findings.push(...findings);
        addRepairAndRevalidateSlices(state, findings, slice.id, runId);
        addMissionEvent(
          state,
          "mission.validator_failed",
          `${validator} reported ${findings.length} finding(s) for ${slice.id}`,
        );
      } else {
        state.findings = state.findings.map((finding) =>
          finding.status === "open" ? { ...finding, status: "resolved" } : finding,
        );
        addMissionEvent(state, "mission.validator_passed", `${validator} passed for ${slice.id}`);
      }

      continue;
    }

    state.handoffs.push({
      runId: `${state.id}-worker-${iterations}`,
      role: "worker",
      status: "completed",
      summary: `Auto-completed ${slice.kind} slice: ${slice.title}`,
    });
    slice.status = "completed";
    addMissionEvent(
      state,
      "mission.slice_completed",
      `Completed ${slice.kind} slice ${slice.id}: ${slice.title}`,
    );
  }

  writeFileSync(missionFilePath(root, manifest, state.id), JSON.stringify(state, null, 2), "utf8");

  return ok(
    `## Mission Loop Completed\n\n- **Mission:** ${state.id}\n- **Reason:** ${reason}\n- **Iterations:** ${iterations}\n- **Status:** ${state.status}\n- **Completed slices:** ${state.plan.slices.filter((slice) => slice.status === "completed").length}/${state.plan.slices.length}\n- **Open findings:** ${state.findings.filter((finding) => finding.status === "open").length}`,
  );
}

// ── Guardrails Handlers ───────────────────────────────────────────────────────

export function handleGetGuardrails(manifest: Manifest): ToolResult {
  const g = manifest?.guardrails as any;

  if (
    !g ||
    (!g.blocked_actions?.length && !g.require_approval?.length && !g.allowed_domains?.length)
  ) {
    return ok(
      "## Guardrails\n\nNo guardrails configured. " +
        "Add a `guardrails` section to manifest.yaml to constrain agent behavior.",
    );
  }

  const parts: string[] = ["## Guardrails\n"];

  if (g.blocked_actions?.length) {
    parts.push(
      "### 🚫 Blocked Actions (NEVER perform these)\n" +
        "The following actions are strictly prohibited. Refuse them unconditionally:\n\n" +
        g.blocked_actions.map((a: string) => `- \`${a}\``).join("\n"),
    );
  }

  if (g.require_approval?.length) {
    parts.push(
      "### ⚠️ Requires Human Approval (call `request_human_approval` first)\n" +
        "Before performing any of the following, you MUST call the `request_human_approval` tool " +
        "and wait for explicit confirmation:\n\n" +
        g.require_approval.map((a: string) => `- \`${a}\``).join("\n"),
    );
  }

  if (g.allowed_domains?.length) {
    parts.push(
      "### 🌐 Allowed Domains\n" +
        "Browser interactions are permitted only on these domains:\n\n" +
        g.allowed_domains.map((d: string) => `- \`${d}\``).join("\n"),
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
  type:
    | "file_exists"
    | "file_contains"
    | "file_modified_after"
    | "command_succeeds"
    | "http_status"
    | "json_contains";
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

export async function handleVerifyAction(
  root: string,
  input: VerifyActionInput,
): Promise<ToolResult> {
  if (!input.description) return err("'description' is required.");
  if (!input.checks?.length) return err("At least one check is required.");

  const results: { check: VerifyCheck; passed: boolean; detail: string }[] = [];

  for (const check of input.checks) {
    if (check.type === "command_succeeds") {
      if (!check.command) {
        results.push({
          check,
          passed: false,
          detail: "`command` is required for command_succeeds check.",
        });
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
        results.push({
          check,
          passed: false,
          detail: "`path` (URL) is required for http_status check.",
        });
        continue;
      }
      if (!check.expected_status) {
        results.push({
          check,
          passed: false,
          detail: "`expected_status` is required for http_status check.",
        });
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
        results.push({
          check,
          passed: false,
          detail: `Failed to fetch \`${check.path}\`: ${(e as Error).message}`,
        });
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
        results.push({
          check,
          passed: false,
          detail: "`value` is required for file_contains check.",
        });
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
        results.push({
          check,
          passed: false,
          detail: "`after` (ISO timestamp) is required for file_modified_after check.",
        });
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
        results.push({
          check,
          passed: false,
          detail: "`json_path` and `value` are required for json_contains check.",
        });
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
        results.push({
          check,
          passed: false,
          detail: `Could not process JSON in \`${check.path}\`: ${(e as Error).message}`,
        });
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
