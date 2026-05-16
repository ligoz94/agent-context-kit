#!/usr/bin/env node

/**
 * @agent-context-kit/cli
 *
 * Commands:
 *   context-kit init       — scaffold docs/agent/ in the current project
 *   context-kit setup      — auto-scan project and fill all template sections
 *   context-kit sync       — update engine regions, preserve project regions
 *   context-kit check      — validate manifest, L0 token budgets, optional CLAUDE.md size hints
 *   context-kit list       — list prompts and feature files
 *   context-kit new-spec   — scaffold docs/features/<name>.md + registry entry
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  realpathSync,
} from "fs";
import { resolve, join, relative, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import yaml from "js-yaml";
import { execSync } from "child_process";
import {
  createValidatorResult,
  runMissionLoop,
  type MissionValidatorContext,
  type MissionWorkerContext,
  type MissionLoopResult,
} from "@agent-context-kit/missions";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Interactive question helper.
 * Works with both TTY (interactive) and piped stdin (testing / scripted use).
 * When piped, readline fires line events immediately — we queue them and dequeue per question.
 */
const _lineQueue: string[] = [];
const _lineWaiters: Array<(line: string) => void> = [];
let _rlInit = false;

function initRL() {
  if (_rlInit) return;
  _rlInit = true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on("line", (line) => {
    if (_lineWaiters.length > 0) {
      _lineWaiters.shift()!(line.trim());
    } else {
      _lineQueue.push(line.trim());
    }
  });
  rl.on("close", () => {
    // Drain any remaining waiters with empty string
    for (const w of _lineWaiters.splice(0)) w("");
  });
}

function ask(question: string): Promise<string> {
  initRL();
  process.stdout.write(question);
  if (_lineQueue.length > 0) return Promise.resolve(_lineQueue.shift()!);
  return new Promise((res) => _lineWaiters.push(res));
}

/** Published layout: `cli/template` next to `cli/dist`. Monorepo: repo root `template/`. */
export function findTemplateDir(): string {
  const candidates = [resolve(__dirname, "../template"), resolve(__dirname, "../../../template")];
  for (const c of candidates) {
    if (existsSync(join(c, "manifest.yaml"))) return c;
  }
  throw new Error(`Template not found. Tried:\n  ${candidates.join("\n  ")}`);
}

// ── Utils ─────────────────────────────────────────────────────────────────────

export function log(msg: string) {
  console.log(`\x1b[36m[context-kit]\x1b[0m ${msg}`);
}
export function ok(msg: string) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}
export function warn(msg: string) {
  console.log(`\x1b[33m⚠\x1b[0m ${msg}`);
}
export function fail(msg: string) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

export function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

export function copyTemplate(src: string, dest: string, force = false) {
  if (existsSync(dest) && !force) {
    warn(`Skipped (exists): ${relative(process.cwd(), dest)}`);
    return;
  }
  ensureDir(dirname(dest));
  try {
    writeFileSync(dest, readFileSync(src, "utf8"));
    ok(`Created: ${relative(process.cwd(), dest)}`);
  } catch (e) {
    fail(`Cannot write file: ${dest} — ${(e as Error).message}`);
    throw e;
  }
}

export function buildInitManifest(templateContent: string, enableMissionWorkflow: boolean): string {
  if (enableMissionWorkflow) return templateContent;

  let output = templateContent.replace(
    /\n  - name: mission-runtime\n    path: docs\/features\/mission-runtime\/feature\.md\n    status: planned/g,
    "",
  );

  output = output.replace(/\n# ── Mission Runtime \(optional\) ─[\s\S]*$/, "");

  return output.trimEnd() + "\n";
}

export function enableMissionManifest(existingContent: string): string {
  let output = existingContent;

  if (!output.includes("name: mission-runtime")) {
    const newEntry =
      "\n  - name: mission-runtime\n    path: docs/features/mission-runtime/feature.md\n    status: planned";
    if (output.includes("registry: []")) {
      output = output.replace("registry: []", `registry:${newEntry}`);
    } else if (output.includes("registry:")) {
      output = output.replace("registry:", `registry:${newEntry}`);
    } else {
      output += `\nregistry:${newEntry}\n`;
    }
  }

  if (!/\nmission:\n/.test(output)) {
    output =
      output.trimEnd() +
      "\n\n# ── Mission Runtime (optional) ───────────────────────────────────────────────\n" +
      "mission:\n" +
      "  enabled: true\n" +
      "  state_dir: .agent-context-kit/missions\n";
  }

  return output.trimEnd() + "\n";
}

export function cmdEnableMission(cwd: string = process.cwd()) {
  const manifestPath = join(cwd, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    fail("manifest.yaml not found. Run: context-kit init first");
    process.exit(1);
  }

  let templateDir: string;
  try {
    templateDir = findTemplateDir();
  } catch (e) {
    fail((e as Error).message);
    process.exit(1);
  }

  const updatedManifest = enableMissionManifest(readFileSync(manifestPath, "utf8"));
  writeFileSync(manifestPath, updatedManifest, "utf8");
  ok("Updated: manifest.yaml");

  ensureDir(join(cwd, "docs/features/mission-runtime/specs"));
  copyTemplate(
    join(templateDir, "docs/features/mission-runtime/feature.md"),
    join(cwd, "docs/features/mission-runtime/feature.md"),
  );
  copyTemplateDirFiles(templateDir, "docs/features/mission-runtime/specs", cwd);
  copyTemplate(
    join(templateDir, "docs/human/mission-workflow.md"),
    join(cwd, "docs/human/mission-workflow.md"),
  );

  log("Mission workflow enabled.");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Read docs/human/mission-workflow.md");
  console.log("  2. Adjust mission.execution commands in manifest.yaml if needed");
  console.log('  3. Start with: context-kit mission start "Your goal"');
}

export function writeWorkspaceMcpConfig(mcpPath: string, serverName: string, serverEntry: object) {
  let existing: Record<string, any> = {};
  if (existsSync(mcpPath)) {
    try {
      existing = JSON.parse(readFileSync(mcpPath, "utf8"));
    } catch {
      // malformed — overwrite
    }
  }
  const merged = {
    ...existing,
    mcpServers: {
      ...(existing.mcpServers ?? {}),
      [serverName]: serverEntry,
    },
  };
  writeFileSync(mcpPath, JSON.stringify(merged, null, 2));
}

/** Copy every file in a template subdir (e.g. evals) — skips `.gitkeep`. */
export function copyTemplateDirFiles(
  templateDir: string,
  relativeDir: string,
  cwd: string,
  skipNames: Set<string> = new Set([".gitkeep"]),
) {
  const dir = join(templateDir, relativeDir);
  if (!existsSync(dir)) return;
  ensureDir(join(cwd, relativeDir));
  for (const name of readdirSync(dir)) {
    if (skipNames.has(name)) continue;
    const src = join(dir, name);
    if (!statSync(src).isFile()) continue;
    copyTemplate(src, join(cwd, relativeDir, name));
  }
}

// ── Sync: region-aware update ─────────────────────────────────────────────────
// Engine regions (managed by kit):   <!-- agent-context-kit:engine:start/end -->
// Project regions (owned by team):   <!-- agent-context-kit:project:start/end -->

export function syncEngineRegions(filePath: string, templateContent: string): boolean {
  if (!existsSync(filePath)) return false;

  let existing: string;
  try {
    existing = readFileSync(filePath, "utf8");
  } catch (e) {
    fail(`Cannot read file: ${filePath} — ${(e as Error).message}`);
    return false;
  }

  const engineRegex =
    /<!-- agent-context-kit:engine:start -->([\s\S]*?)<!-- agent-context-kit:engine:end -->/g;

  const templateRegions: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = engineRegex.exec(templateContent)) !== null) {
    templateRegions.push(m[0]);
  }

  if (templateRegions.length === 0) return false;

  let updated = existing;
  let regionIndex = 0;
  updated = updated.replace(
    /<!-- agent-context-kit:engine:start -->[\s\S]*?<!-- agent-context-kit:engine:end -->/g,
    () => templateRegions[regionIndex++] ?? "",
  );

  if (updated === existing) return false;
  writeFileSync(filePath, updated);
  return true;
}

// ── Commands ──────────────────────────────────────────────────────────────────

export async function cmdInit(cwd: string = process.cwd()) {
  let templateDir: string;
  try {
    templateDir = findTemplateDir();
  } catch (e) {
    fail((e as Error).message);
    process.exit(1);
  }

  // ── Ask which AI editor templates to install ────────────────────────────
  const answer = await ask(
    "\x1b[36m[context-kit]\x1b[0m Which AI editor(s) do you use?\n" +
      "  1) Claude Code (CLAUDE.md + .mcp.json)\n" +
      "  2) Cursor (.cursor/rules + hooks + mcp.json)\n" +
      "  3) Codex (AGENTS.md)\n" +
      "  4) All\n" +
      "  Choice [4]: ",
  );
  const choice =
    answer === "1" ? "claude" : answer === "2" ? "cursor" : answer === "3" ? "codex" : "all";
  const installClaude = choice === "claude" || choice === "all";
  const installCursor = choice === "cursor" || choice === "all";
  const installCodex = choice === "codex" || choice === "all";

  // ── Ask about token-saving tools ────────────────────────────────────────
  const tokenAnswer = await ask(
    "\x1b[36m[context-kit]\x1b[0m Enable token-saving tools? (caveman ~75% fewer output tokens + RTK shorter terminal output)\n" +
      "  y) Yes — set up caveman & RTK\n" +
      "  n) No\n" +
      "  Choice [y]: ",
  );
  const installTokenTools = tokenAnswer !== "n" && tokenAnswer !== "no";

  const missionAnswer = await ask(
    "\x1b[36m[context-kit]\x1b[0m Enable mission workflow scaffolding?\n" +
      "  y) Yes — add mission runtime docs/config\n" +
      "  n) No — keep the classic agent-context-kit workflow only\n" +
      "  Choice [n]: ",
  );
  const installMissionWorkflow = missionAnswer === "y" || missionAnswer === "yes";

  log("Initialising agent-context-kit...");

  const manifestContent = buildInitManifest(
    readFileSync(join(templateDir, "manifest.yaml"), "utf8"),
    installMissionWorkflow,
  );
  writeFileSync(join(cwd, "manifest.yaml"), manifestContent);
  ok("Created: manifest.yaml");

  const agentFiles = [
    "values.md",
    "glossary.md",
    "architecture-primer.md",
    "context-policy.md",
    "key-learnings.md",
    "app-config.md",
    "product-context.md",
    "standard-tdd.md",
    "forensic-debugging.md",
    "code-review-reception.md",
    "release-workflow.md",
    "rationalization-tables.md",
  ];

  ensureDir(join(cwd, "docs/agent/prompts"));
  ensureDir(join(cwd, "docs/agent/evals"));
  ensureDir(join(cwd, "docs/features/specs"));
  ensureDir(join(cwd, "docs/human"));
  ensureDir(join(cwd, "docs/decisions"));

  for (const f of agentFiles) {
    copyTemplate(join(templateDir, "docs/agent", f), join(cwd, "docs/agent", f));
  }

  copyTemplateDirFiles(
    templateDir,
    "docs/agent/evals",
    cwd,
    new Set([".gitkeep", "metrics.jsonl"]),
  );
  copyTemplateDirFiles(templateDir, "docs/agent/prompts", cwd);

  // Hub dispatcher — the entry point for every agent session
  copyTemplate(join(templateDir, "docs/README.md"), join(cwd, "docs/README.md"));

  copyTemplate(
    join(templateDir, "docs/features/_template.md"),
    join(cwd, "docs/features/_template.md"),
  );

  copyTemplate(
    join(templateDir, "docs/features/specs/_template.md"),
    join(cwd, "docs/features/specs/_template.md"),
  );

  if (installMissionWorkflow) {
    ensureDir(join(cwd, "docs/features/mission-runtime/specs"));
    copyTemplate(
      join(templateDir, "docs/features/mission-runtime/feature.md"),
      join(cwd, "docs/features/mission-runtime/feature.md"),
    );
    copyTemplateDirFiles(templateDir, "docs/features/mission-runtime/specs", cwd);
    copyTemplate(
      join(templateDir, "docs/human/mission-workflow.md"),
      join(cwd, "docs/human/mission-workflow.md"),
    );
  }

  copyTemplate(
    join(templateDir, "docs/decisions/_template.md"),
    join(cwd, "docs/decisions/_template.md"),
  );
  copyTemplate(
    join(templateDir, "docs/decisions/README.md"),
    join(cwd, "docs/decisions/README.md"),
  );

  copyTemplate(
    join(templateDir, "docs/human/toolshed-mcp-setup.md"),
    join(cwd, "docs/human/toolshed-mcp-setup.md"),
  );

  copyTemplate(
    join(templateDir, "docs/human/way-of-working.md"),
    join(cwd, "docs/human/way-of-working.md"),
  );

  copyTemplate(
    join(templateDir, "docs/human/agentic-development.md"),
    join(cwd, "docs/human/agentic-development.md"),
  );

  copyTemplate(join(templateDir, "docs/human/testing.md"), join(cwd, "docs/human/testing.md"));

  copyTemplate(
    join(templateDir, "docs/human/agent-context-power-user-stack.md"),
    join(cwd, "docs/human/agent-context-power-user-stack.md"),
  );

  if (installCursor) {
    ensureDir(join(cwd, ".cursor/rules"));
    ensureDir(join(cwd, ".cursor/hooks"));
    copyTemplateDirFiles(
      templateDir,
      ".cursor/rules",
      cwd,
      installTokenTools
        ? new Set([".gitkeep"])
        : new Set([".gitkeep", "caveman.mdc", "rtk-bash.mdc"]),
    );
    copyTemplate(join(templateDir, ".cursor/hooks.json"), join(cwd, ".cursor/hooks.json"));
    copyTemplate(
      join(templateDir, ".cursor/hooks/README.md"),
      join(cwd, ".cursor/hooks/README.md"),
    );
    try {
      writeWorkspaceMcpConfig(join(cwd, ".cursor/mcp.json"), "toolshed", {
        command: "npx",
        args: [
          "-y",
          "@agent-context-kit/toolshed-server",
          "--manifest",
          join(cwd, "manifest.yaml"),
        ],
      });
      ok("Created: .cursor/mcp.json");
    } catch (e) {
      fail(`Could not write .cursor/mcp.json: ${(e as Error).message}`);
    }
  }

  if (installClaude) {
    copyTemplate(join(templateDir, "CLAUDE.md"), join(cwd, "CLAUDE.md"));
  }

  if (installCodex) {
    const agentsPath = join(cwd, "AGENTS.md");
    if (!existsSync(agentsPath)) {
      writeFileSync(
        agentsPath,
        `# Agent Instructions\n\n` +
          `> Auto-generated by agent-context-kit.\n\n` +
          `## MANDATORY FIRST ACTION\n\n` +
          `Call \`get_session_bootstrap()\` immediately if Toolshed MCP is available.\n` +
          `This loads project identity, context policy, architecture, glossary, and active gates.\n` +
          `If MCP is not available, read: docs/agent/values.md → docs/agent/architecture-primer.md → docs/agent/glossary.md\n\n` +
          `## Context — load at session start\n\n` +
          `- docs/agent/values.md\n` +
          `- docs/agent/architecture-primer.md\n` +
          `- docs/agent/glossary.md\n\n` +
          `## Context — load on demand\n\n` +
          `- docs/agent/context-policy.md\n` +
          `- docs/agent/key-learnings.md\n` +
          `- docs/features/<name>.md  (relevant feature spec only)\n`,
      );
      ok("AGENTS.md");
    } else {
      warn("Skipped (exists): AGENTS.md");
    }
  }

  // ── GitHub Copilot ────────────────────────────────────────────────────────
  const copilotDir = join(cwd, ".github");
  const copilotPath = join(copilotDir, "copilot-instructions.md");
  if (!existsSync(copilotPath)) {
    ensureDir(copilotDir);
    writeFileSync(
      copilotPath,
      `# Copilot Instructions\n\n` +
        `## Session start\n\n` +
        `Call \`get_session_bootstrap()\` immediately if Toolshed MCP is available.\n` +
        `This loads project identity, context policy, architecture, glossary, and active gates.\n` +
        `If MCP is not available, read: docs/agent/values.md → docs/agent/context-policy.md → docs/agent/app-config.md\n` +
        `Do not skip this step.\n` +
        `\n` +
        `## Context\n` +
        `- Feature specs: docs/features/\n` +
        `- Key learnings: docs/agent/key-learnings.md\n` +
        `- Glossary: docs/agent/glossary.md\n`,
    );
    ok(".github/copilot-instructions.md");
  } else {
    warn("Skipped (exists): .github/copilot-instructions.md");
  }

  console.log("");
  log("Step 1 of 3 complete. Run next:");
  console.log("");
  console.log("  \x1b[1m2. npx @agent-context-kit/cli setup\x1b[0m");
  console.log("     Auto-detects your stack and fills docs + MCP config files.");
  console.log("");
  console.log("  Then step 3 — tell your AI agent:");
  console.log(
    "  \x1b[2mRead docs/agent/prompts/populate-project.md and populate all project docs.\x1b[0m",
  );
  console.log("");
  if (installClaude)
    console.log("  Note: .mcp.json was created — restart Claude Code to activate Toolshed MCP.");
  if (installCursor)
    console.log("  Note: .cursor/mcp.json was created — restart Cursor to activate Toolshed MCP.");
  if (installTokenTools) {
    console.log("");
    log("Token-saving tools setup:");
    if (installCursor) {
      console.log(
        "  ✓ Cursor: caveman.mdc + rtk-bash.mdc written to .cursor/rules/ (auto-activate on restart)",
      );
      console.log("    RTK install: https://github.com/rtk-ai/rtk");
    }
    if (installClaude) {
      console.log("  Claude Code — run once to install caveman plugin:");
      console.log("    \x1b[2mclaude plugin marketplace add JuliusBrussee/caveman\x1b[0m");
      console.log("    \x1b[2mclaude plugin install caveman@caveman\x1b[0m");
      console.log("    RTK install: https://github.com/rtk-ai/rtk");
    }
    if (installCodex && !installClaude && !installCursor) {
      console.log("  Run once to install caveman:");
      console.log("    \x1b[2mnpx skills add JuliusBrussee/caveman\x1b[0m");
    }
  }
}

export function cmdSync(cwd: string = process.cwd()) {
  let templateDir: string;
  try {
    templateDir = findTemplateDir();
  } catch (e) {
    fail((e as Error).message);
    process.exit(1);
  }

  log("Syncing engine regions and new docs...");

  const agentFiles = [
    "values.md",
    "glossary.md",
    "architecture-primer.md",
    "context-policy.md",
    "key-learnings.md",
    "app-config.md",
    "product-context.md",
    "standard-tdd.md",
    "forensic-debugging.md",
    "code-review-reception.md",
    "release-workflow.md",
    "rationalization-tables.md",
  ];

  let synced = 0;
  let created = 0;
  for (const f of agentFiles) {
    const dest = join(cwd, "docs/agent", f);
    const src = join(templateDir, "docs/agent", f);
    if (!existsSync(src)) continue;

    if (!existsSync(dest)) {
      copyTemplate(src, dest);
      ok(`Created: docs/agent/${f}`);
      created++;
      continue;
    }

    let template: string;
    try {
      template = readFileSync(src, "utf8");
    } catch (e) {
      fail(`Cannot read template: ${src} — ${(e as Error).message}`);
      continue;
    }
    if (syncEngineRegions(dest, template)) {
      ok(`Synced: docs/agent/${f}`);
      synced++;
    }
  }

  // ── Sync prompt files — create missing ones ──────────────────────────────
  const promptsDir = join(templateDir, "docs/agent/prompts");
  if (existsSync(promptsDir)) {
    for (const name of readdirSync(promptsDir)) {
      if (name === ".gitkeep" || !statSync(join(promptsDir, name)).isFile()) continue;
      const dest = join(cwd, "docs/agent/prompts", name);
      if (existsSync(dest)) continue;
      copyTemplate(join(promptsDir, name), dest);
      ok(`Created: docs/agent/prompts/${name}`);
      created++;
    }
  }

  // ── Sync manifest.yaml — add missing sections ───────────────────────────
  const manifestDest = join(cwd, "manifest.yaml");
  const manifestSrc = join(templateDir, "manifest.yaml");
  let manifestUpdated = false;
  if (existsSync(manifestDest) && existsSync(manifestSrc)) {
    let existing = readFileSync(manifestDest, "utf8");
    const tmpl = readFileSync(manifestSrc, "utf8");

    // Extract commented-out template sections between their headers and next header
    const sections: { header: string; content: string }[] = [];
    const sectionRegex = /(^# ── .+ ──+\n)([\s\S]*?)(?=^# ── |\z)/gm;
    let m: RegExpExecArray | null;
    while ((m = sectionRegex.exec(tmpl)) !== null) {
      const header = m[1].trim();
      const content = m[2];
      // Only add sections that are commented out (all lines start with #)
      if (content.trim().split("\n").every((l) => l.trim() === "" || l.trim().startsWith("#"))) {
        sections.push({ header, content });
      }
    }

    for (const section of sections) {
      const headerPattern = section.header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(headerPattern, "m").test(existing)) continue;
      existing = `${existing.trimEnd()}\n\n${section.header}\n${section.content.trimEnd()}\n`;
      manifestUpdated = true;
    }

    if (manifestUpdated) {
      writeFileSync(manifestDest, existing);
      ok("Updated: manifest.yaml (added new sections)");
    }
  }

  // ── Sync platform config files (cursor, claude, copilot, codex) ────────
  const platformFiles: { src: string; dest: string; description: string }[] = [];

  // CLAUDE.md (for Claude Code / Claude Desktop)
  const claudeSrc = join(templateDir, "CLAUDE.md");
  const claudeDest = join(cwd, "CLAUDE.md");
  if (existsSync(claudeSrc)) platformFiles.push({ src: claudeSrc, dest: claudeDest, description: "CLAUDE.md" });

  // .mcp.json (Claude Code MCP config — dynamically generated, not in template)
  const claudeMcpDest = join(cwd, ".mcp.json");
  if (!existsSync(claudeMcpDest)) {
    writeWorkspaceMcpConfig(claudeMcpDest, "toolshed", {
      command: "npx",
      args: ["-y", "@agent-context-kit/toolshed-server", "--manifest", join(cwd, "manifest.yaml")],
    });
    ok("Created: .mcp.json");
    created++;
  }

  // .cursor/rules/*.mdc
  const cursorRulesSrc = join(templateDir, ".cursor/rules");
  if (existsSync(cursorRulesSrc)) {
    for (const name of readdirSync(cursorRulesSrc)) {
      if (!name.endsWith(".mdc")) continue;
      platformFiles.push({
        src: join(cursorRulesSrc, name),
        dest: join(cwd, ".cursor/rules", name),
        description: `.cursor/rules/${name}`,
      });
    }
  }

  // .cursor/mcp.json (dynamically generated, not in template)
  const mcpDest = join(cwd, ".cursor/mcp.json");
  if (!existsSync(mcpDest)) {
    ensureDir(dirname(mcpDest));
    writeWorkspaceMcpConfig(mcpDest, "toolshed", {
      command: "npx",
      args: ["-y", "@agent-context-kit/toolshed-server", "--manifest", join(cwd, "manifest.yaml")],
    });
    ok("Created: .cursor/mcp.json");
    created++;
  }

  // .cursor/hooks.json
  const hooksJsonSrc = join(templateDir, ".cursor/hooks.json");
  const hooksJsonDest = join(cwd, ".cursor/hooks.json");
  if (existsSync(hooksJsonSrc)) platformFiles.push({ src: hooksJsonSrc, dest: hooksJsonDest, description: ".cursor/hooks.json" });

  // .cursor/hooks/README.md
  const hooksReadmeSrc = join(templateDir, ".cursor/hooks/README.md");
  const hooksReadmeDest = join(cwd, ".cursor/hooks/README.md");
  if (existsSync(hooksReadmeSrc)) platformFiles.push({ src: hooksReadmeSrc, dest: hooksReadmeDest, description: ".cursor/hooks/README.md" });

  for (const pf of platformFiles) {
    if (existsSync(pf.dest)) continue;
    ensureDir(dirname(pf.dest));
    copyTemplate(pf.src, pf.dest);
    ok(`Created: ${pf.description}`);
    created++;
  }

  // .github/copilot-instructions.md (not in template, generated)
  const copilotDest = join(cwd, ".github/copilot-instructions.md");
  if (!existsSync(copilotDest)) {
    ensureDir(dirname(copilotDest));
    writeFileSync(
      copilotDest,
      `# Copilot Instructions\n\n` +
        `## Session start\n\n` +
        `Call \`get_session_bootstrap()\` immediately if Toolshed MCP is available.\n` +
        `This loads project identity, context policy, architecture, glossary, and active gates.\n` +
        `If MCP is not available, read: docs/agent/values.md → docs/agent/context-policy.md → docs/agent/app-config.md\n` +
        `Do not skip this step.\n` +
        `\n` +
        `## Context\n` +
        `- Feature specs: docs/features/\n` +
        `- Key learnings: docs/agent/key-learnings.md\n` +
        `- Glossary: docs/agent/glossary.md\n`,
    );
    ok("Created: .github/copilot-instructions.md");
    created++;
  }

  // AGENTS.md (not in template, generated)
  const agentsDest = join(cwd, "AGENTS.md");
  if (!existsSync(agentsDest)) {
    writeFileSync(
      agentsDest,
      `# Agent Instructions\n\n` +
        `## MANDATORY FIRST ACTION\n\n` +
        `Call \`get_session_bootstrap()\` immediately if Toolshed MCP is available.\n` +
        `This loads project identity, context policy, architecture, glossary, and active gates.\n` +
        `If MCP is not available, read: docs/agent/values.md → docs/agent/architecture-primer.md → docs/agent/glossary.md\n\n` +
        `## Context — load on demand\n\n` +
        `- docs/agent/context-policy.md\n` +
        `- docs/agent/key-learnings.md\n` +
        `- docs/features/<name>.md  (relevant feature spec only)\n`,
    );
    ok("Created: AGENTS.md");
    created++;
  }

  const parts: string[] = [];
  if (created > 0) parts.push(`${created} file(s) created`);
  if (synced > 0) parts.push(`${synced} file(s) updated (project regions preserved)`);
  if (manifestUpdated) parts.push("manifest.yaml updated");

  if (parts.length === 0) {
    log("All engine regions are up to date.");
  } else {
    log(parts.join(". ") + ".");
  }
}

export function cmdCheck(cwd: string = process.cwd()): number {
  const manifestPath = join(cwd, "manifest.yaml");
  let errors = 0;
  let warnings = 0;

  log("Checking project...");

  if (!existsSync(manifestPath)) {
    fail("manifest.yaml not found. Run: context-kit init");
    return 1;
  }

  const required = [
    "docs/README.md",
    "docs/agent/values.md",
    "docs/agent/context-policy.md",
    "docs/agent/architecture-primer.md",
    "docs/agent/key-learnings.md",
    "docs/agent/app-config.md",
  ];

  for (const f of required) {
    if (!existsSync(join(cwd, f))) {
      fail(`Missing required file: ${f}`);
      errors++;
    } else {
      ok(f);
    }
  }

  const TOKEN_WARN = 800;
  const l0Files = [
    "docs/agent/values.md",
    "docs/agent/glossary.md",
    "docs/agent/architecture-primer.md",
  ];
  for (const f of l0Files) {
    const abs = join(cwd, f);
    if (!existsSync(abs)) continue;
    try {
      const tokens = Math.round(readFileSync(abs, "utf8").length / 4);
      if (tokens > TOKEN_WARN) {
        warn(`${f} is ~${tokens} tokens (L0 target: < ${TOKEN_WARN}). Consider trimming.`);
        warnings++;
      }
    } catch (e) {
      warn(`Cannot read ${f} for token check: ${(e as Error).message}`);
    }
  }

  const claudePath = join(cwd, "CLAUDE.md");
  const CLAUDE_TOKEN_WARN = 500;
  const CLAUDE_LINE_WARN = 200;
  if (existsSync(claudePath)) {
    try {
      const claudeRaw = readFileSync(claudePath, "utf8");
      const claudeTokens = Math.round(claudeRaw.length / 4);
      const lineCount = claudeRaw.split(/\r?\n/).length;
      if (claudeTokens > CLAUDE_TOKEN_WARN) {
        warn(
          `CLAUDE.md is ~${claudeTokens} tokens (keep root memory short; target often < ~${CLAUDE_TOKEN_WARN}). See docs/human/agent-context-power-user-stack.md`,
        );
        warnings++;
      }
      if (lineCount > CLAUDE_LINE_WARN) {
        warn(
          `CLAUDE.md has ${lineCount} lines (consider trimming; many teams stay under ~${CLAUDE_LINE_WARN}).`,
        );
        warnings++;
      }
      ok("CLAUDE.md");
    } catch (e) {
      warn(`Cannot read CLAUDE.md for size check: ${(e as Error).message}`);
    }
  }

  console.log("");
  if (errors > 0) {
    fail(`${errors} error(s), ${warnings} warning(s). Fix errors before running the server.`);
    return 1;
  } else {
    ok(`Check passed. ${warnings} warning(s).`);
    return 0;
  }
}

export function cmdNewSpec(name?: string, cwd: string = process.cwd()) {
  if (!name) {
    fail("Name is required. Usage: context-kit new-spec <name>");
    process.exit(1);
  }

  const manifestPath = join(cwd, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    fail("manifest.yaml not found. Are you in the project root?");
    process.exit(1);
  }

  let templateDir: string;
  try {
    templateDir = findTemplateDir();
  } catch (e) {
    fail((e as Error).message);
    process.exit(1);
  }

  const destDir = join(cwd, "docs", "features");
  ensureDir(destDir);
  const destPath = join(destDir, `${name}.md`);

  if (existsSync(destPath)) {
    fail(`Spec already exists at docs/features/${name}.md`);
    process.exit(1);
  }

  const templatePath = join(templateDir, "docs/features/_template.md");
  let templateContent = "";
  try {
    templateContent = readFileSync(templatePath, "utf8");
    templateContent = templateContent.replace(/# Feature: <feature-name>/, `# Feature: ${name}`);
    writeFileSync(destPath, templateContent, "utf8");
    ok(`Created spec: docs/features/${name}.md`);
  } catch (e) {
    fail(`Could not create spec file: ${(e as Error).message}`);
    process.exit(1);
  }

  let raw = readFileSync(manifestPath, "utf8");
  if (!raw.includes(`name: ${name}`)) {
    const newEntry = `\n  - name: ${name}\n    path: docs/features/${name}.md\n    status: wip`;
    if (raw.includes("registry: []")) {
      raw = raw.replace("registry: []", `registry:${newEntry}`);
    } else if (raw.includes("registry:")) {
      raw = raw.replace("registry:", `registry:${newEntry}`);
    } else {
      raw += `\nregistry:${newEntry}\n`;
    }
    writeFileSync(manifestPath, raw, "utf8");
    ok(`Added ${name} directly to manifest.yaml registry as 'wip'.`);
  } else {
    warn(`Feature ${name} is already in manifest.yaml registry.`);
  }

  log(`Done! You can now edit docs/features/${name}.md`);
}

export function cmdList(cwd: string = process.cwd()) {
  log("Available resources:\n");

  const promptsDir = join(cwd, "docs/agent/prompts");
  if (existsSync(promptsDir)) {
    const prompts = readdirSync(promptsDir).filter((f) => f.endsWith(".md"));
    console.log("  Prompts:");
    prompts.forEach((p) => console.log(`    - ${p.replace(".md", "")}`));
  }

  const featuresDir = join(cwd, "docs/features");
  if (existsSync(featuresDir)) {
    const features = readdirSync(featuresDir).filter(
      (f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md",
    );
    console.log("\n  Features:");
    features.forEach((f) => console.log(`    - ${f.replace(".md", "")}`));
  }
}

function readManifest(cwd: string): Record<string, any> {
  const manifestPath = join(cwd, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    throw new Error("manifest.yaml not found. Are you in the project root?");
  }
  return (yaml.load(readFileSync(manifestPath, "utf8")) as Record<string, any>) ?? {};
}

function missionStateDir(cwd: string, manifest: Record<string, any>): string {
  return join(cwd, manifest.mission?.state_dir ?? ".agent-context-kit/missions");
}

function missionFile(cwd: string, manifest: Record<string, any>, missionId: string): string {
  return join(missionStateDir(cwd, manifest), `${missionId}.json`);
}

function latestMissionId(cwd: string, manifest: Record<string, any>): string | null {
  const dir = missionStateDir(cwd, manifest);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort((left, right) => statSync(join(dir, right)).mtimeMs - statSync(join(dir, left)).mtimeMs);
  return files[0]?.replace(/\.json$/, "") ?? null;
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

function createMissionPlan(goal: string, issue?: { number: number; title: string; body?: string }) {
  const sourceText = issue ? `${issue.title}\n${issue.body ?? ""}` : goal;
  const tasks = extractTaskLines(sourceText);
  if (tasks.length === 0) {
    return {
      summary: issue
        ? `Plan derived from GitHub issue #${issue.number}: ${issue.title}`
        : `Plan derived from goal: ${goal}`,
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

function createValidationAssertions(goal: string, issue?: { title: string; body?: string }) {
  const sourceText = issue ? `${issue.title}\n${issue.body ?? ""}` : goal;
  const explicitAssertions = normalizeLines(sourceText)
    .filter((line) => /should|must|acceptance|criteria|verify|validation/i.test(line))
    .slice(0, 4)
    .map((line, index) => ({
      id: `vc-${index + 1}`,
      title: line.slice(0, 80),
      type: /ui|page|render|click|browser/i.test(line) ? "behavioral" : "scrutiny",
      description: line,
    }));
  if (explicitAssertions.length > 0) return explicitAssertions;
  return manifestLikeDefaultAssertions(goal);
}

function manifestLikeDefaultAssertions(goal: string) {
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

function fetchGitHubIssue(
  issueNumber: number,
  repo?: string,
): { number: number; title: string; body?: string; repo?: string; url?: string } {
  const repoArgs = repo ? ["--repo", repo] : [];
  const output = execSync(
    [
      "gh",
      "issue",
      "view",
      String(issueNumber),
      ...repoArgs,
      "--json",
      "number,title,body,url",
    ].join(" "),
    { encoding: "utf8" },
  );
  const parsed = JSON.parse(output) as {
    number: number;
    title: string;
    body?: string;
    url?: string;
  };
  return { ...parsed, repo };
}

function parseMissionStartArgs(args: string[]): {
  issueNumber?: number;
  repo?: string;
  goal?: string;
} {
  const rest = [...args];
  let issueNumber: number | undefined;
  let repo: string | undefined;
  const goalParts: string[] = [];

  while (rest.length > 0) {
    const token = rest.shift()!;
    if (token === "--issue") {
      const value = rest.shift();
      issueNumber = value ? Number(value) : undefined;
      continue;
    }
    if (token === "--repo") {
      repo = rest.shift();
      continue;
    }
    goalParts.push(token);
  }

  return { issueNumber, repo, goal: goalParts.join(" ").trim() || undefined };
}

function parseMissionValidateArgs(args: string[]): {
  missionId?: string;
  validator?: "scrutiny" | "behavioral" | "review";
  summary?: string;
  failedChecks: string[];
} {
  const rest = [...args];
  const failedChecks: string[] = [];
  let missionId: string | undefined;
  let validator: "scrutiny" | "behavioral" | "review" | undefined;
  let summary: string | undefined;

  while (rest.length > 0) {
    const token = rest.shift()!;
    if (token === "--mission") {
      missionId = rest.shift();
      continue;
    }
    if (token === "--validator") {
      validator = rest.shift() as "scrutiny" | "behavioral" | "review" | undefined;
      continue;
    }
    if (token === "--summary") {
      summary = rest.shift();
      continue;
    }
    if (token === "--failed-check") {
      const value = rest.shift();
      if (value) failedChecks.push(value);
      continue;
    }
  }

  return { missionId, validator, summary, failedChecks };
}

function parseMissionRunArgs(args: string[]): {
  missionId?: string;
  maxIterations?: number;
  validator: "scrutiny" | "behavioral" | "review";
  simulatedFindings: string[];
  workerCommands: string[];
  validateCommands: string[];
} {
  const rest = [...args];
  const simulatedFindings: string[] = [];
  const workerCommands: string[] = [];
  const validateCommands: string[] = [];
  let missionId: string | undefined;
  let maxIterations: number | undefined;
  let validator: "scrutiny" | "behavioral" | "review" = "scrutiny";

  while (rest.length > 0) {
    const token = rest.shift()!;
    if (token === "--mission") {
      missionId = rest.shift();
      continue;
    }
    if (token === "--max-iterations") {
      const value = rest.shift();
      maxIterations = value ? Number(value) : undefined;
      continue;
    }
    if (token === "--validator") {
      validator = (rest.shift() as "scrutiny" | "behavioral" | "review" | undefined) ?? "scrutiny";
      continue;
    }
    if (token === "--simulate-finding") {
      const value = rest.shift();
      if (value) simulatedFindings.push(value);
      continue;
    }
    if (token === "--worker-command") {
      const value = rest.shift();
      if (value) workerCommands.push(value);
      continue;
    }
    if (token === "--validate-command") {
      const value = rest.shift();
      if (value) validateCommands.push(value);
    }
  }

  return {
    missionId,
    maxIterations,
    validator,
    simulatedFindings,
    workerCommands,
    validateCommands,
  };
}

function commandErrorMessage(error: unknown): string {
  const stderr = (error as { stderr?: string | Buffer }).stderr;
  if (typeof stderr === "string" && stderr.trim()) return stderr.trim();
  if (stderr && typeof Buffer !== "undefined" && Buffer.isBuffer(stderr)) {
    const text = stderr.toString("utf8").trim();
    if (text) return text;
  }

  return (error as Error).message;
}

function runMissionCommands(
  commands: string[],
  cwd: string,
): Array<{ command: string; exitCode: number; output?: string }> {
  return commands.map((command) => {
    try {
      const output = execSync(command, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      return { command, exitCode: 0, output };
    } catch (error) {
      return {
        command,
        exitCode: (error as { status?: number }).status ?? 1,
        output: commandErrorMessage(error),
      };
    }
  });
}

function manifestMissionExecution(
  manifest: Record<string, any>,
  validator: "scrutiny" | "behavioral" | "review",
) {
  const execution = manifest.mission?.execution as
    | {
        worker_commands?: string[];
        validator_commands?: Partial<Record<"scrutiny" | "behavioral" | "review", string[]>>;
      }
    | undefined;

  return {
    workerCommands: execution?.worker_commands ?? [],
    validateCommands: execution?.validator_commands?.[validator] ?? [],
  };
}

function missionRunTimeline(events: Array<{ type: string; message: string }>): string[] {
  return events
    .filter((event) => event.type !== "mission.created")
    .slice(-6)
    .map((event) => `- ${event.message}`);
}

export function cmdMissionStart(rawArgs?: string | string[], cwd: string = process.cwd()) {
  const parsedArgs = Array.isArray(rawArgs) ? parseMissionStartArgs(rawArgs) : { goal: rawArgs };
  let issue:
    | { number: number; title: string; body?: string; repo?: string; url?: string }
    | undefined;
  if (parsedArgs.issueNumber) {
    issue = fetchGitHubIssue(parsedArgs.issueNumber, parsedArgs.repo);
  }

  const goal = parsedArgs.goal ?? issue?.title;
  if (!goal) {
    fail(
      "Goal is required. Usage: context-kit mission start <goal> or context-kit mission start --issue <number>",
    );
    process.exit(1);
  }

  const manifest = readManifest(cwd);
  const dir = missionStateDir(cwd, manifest);
  ensureDir(dir);
  const missionId = `${
    goal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "mission"
  }-${Date.now()}`;
  const now = new Date().toISOString();
  const state = {
    id: missionId,
    goal,
    status: "planned",
    createdAt: now,
    updatedAt: now,
    sourceIssue: issue,
    plan: createMissionPlan(goal, issue),
    validationContract:
      manifest.mission?.validation_contract?.assertions ?? createValidationAssertions(goal, issue),
    handoffs: [],
    events: [
      { timestamp: now, type: "mission.created", message: `Mission created for goal: ${goal}` },
    ],
    findings: [],
  };

  writeFileSync(missionFile(cwd, manifest, missionId), JSON.stringify(state, null, 2), "utf8");
  ok(`Created mission: ${missionId}`);
  console.log(`State file: ${relative(cwd, missionFile(cwd, manifest, missionId))}`);
}

export function cmdMissionStatus(missionId?: string, cwd: string = process.cwd()) {
  const manifest = readManifest(cwd);
  const resolvedMissionId = missionId ?? latestMissionId(cwd, manifest);
  if (!resolvedMissionId) {
    fail("No mission state found. Start one with: context-kit mission start <goal>");
    process.exit(1);
  }

  const filePath = missionFile(cwd, manifest, resolvedMissionId);
  if (!existsSync(filePath)) {
    fail(`Mission not found: ${resolvedMissionId}`);
    process.exit(1);
  }

  const state = JSON.parse(readFileSync(filePath, "utf8")) as {
    id: string;
    goal: string;
    status: string;
    sourceIssue?: { number: number; repo?: string };
    plan: {
      summary: string;
      slices: Array<{ id: string; title: string; status: string; kind: string }>;
    };
    handoffs: Array<{ role: string; status: string; summary: string }>;
    events: Array<{ message: string }>;
    findings: Array<{ summary: string; validator: string; severity: string; status: string }>;
  };
  const lastEvent = state.events[state.events.length - 1]?.message ?? "none";
  const lastHandoff = state.handoffs[state.handoffs.length - 1];
  console.log(`Mission: ${state.id}`);
  console.log(`Goal: ${state.goal}`);
  console.log(`Status: ${state.status}`);
  if (state.sourceIssue)
    console.log(
      `Source issue: #${state.sourceIssue.number}${state.sourceIssue.repo ? ` (${state.sourceIssue.repo})` : ""}`,
    );
  console.log(`Plan summary: ${state.plan.summary}`);
  console.log(`Planned slices: ${state.plan.slices.length}`);
  console.log(
    `Open findings: ${state.findings.filter((finding) => finding.status === "open").length}`,
  );
  console.log(`Last event: ${lastEvent}`);
  if (lastHandoff) {
    console.log(
      `Last handoff: ${lastHandoff.role} / ${lastHandoff.status} — ${lastHandoff.summary}`,
    );
  }
}

export function cmdMissionValidate(rawArgs: string[], cwd: string = process.cwd()) {
  const { missionId, validator, summary, failedChecks } = parseMissionValidateArgs(rawArgs);
  if (!validator || !summary) {
    fail(
      "Usage: context-kit mission validate --validator <scrutiny|behavioral|review> --summary <text> [--mission <id>] [--failed-check <text> ...]",
    );
    process.exit(1);
  }

  const manifest = readManifest(cwd);
  const resolvedMissionId = missionId ?? latestMissionId(cwd, manifest);
  if (!resolvedMissionId) {
    fail("No mission state found. Start one with: context-kit mission start <goal>");
    process.exit(1);
  }

  const filePath = missionFile(cwd, manifest, resolvedMissionId);
  if (!existsSync(filePath)) {
    fail(`Mission not found: ${resolvedMissionId}`);
    process.exit(1);
  }

  const state = JSON.parse(readFileSync(filePath, "utf8")) as {
    id: string;
    status: string;
    plan: {
      slices: Array<{
        id: string;
        title: string;
        kind: string;
        status: string;
        summary?: string;
        dependsOn?: string[];
      }>;
    };
    findings: Array<{
      id: string;
      validator: string;
      severity: string;
      summary: string;
      details?: string;
      relatedSliceId?: string;
      status: string;
    }>;
    events: Array<{ timestamp: string; type: string; message: string }>;
    updatedAt: string;
  };

  const now = new Date().toISOString();
  const findings = failedChecks.map((check, index) => ({
    id: `${validator}-${Date.now()}-${index + 1}`,
    validator,
    severity: validator === "behavioral" ? "high" : "medium",
    summary: check,
    details: summary,
    status: "open",
  }));
  state.findings.push(...findings);
  state.events.push({
    timestamp: now,
    type: "mission.validator_result",
    message: `${validator} validator ${failedChecks.length > 0 ? "failed" : "passed"}: ${summary}`,
  });
  state.updatedAt = now;
  if (findings.length > 0) {
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
      });
    }
    state.status = "blocked";
  }

  writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
  ok(`Recorded ${validator} validator result for ${resolvedMissionId}`);
}

export async function cmdMissionRun(rawArgs: string[], cwd: string = process.cwd()) {
  const {
    missionId,
    maxIterations,
    validator,
    simulatedFindings,
    workerCommands: cliWorkerCommands,
    validateCommands: cliValidateCommands,
  } = parseMissionRunArgs(rawArgs);
  let manifest: Record<string, any>;
  try {
    manifest = readManifest(cwd);
  } catch (error) {
    fail(
      `${(error as Error).message} If you are inside this monorepo, use a generated project directory or run from template/ after creating a manifest.`,
    );
    process.exit(1);
  }
  const configuredStateDir = manifest.mission?.state_dir as string | undefined;
  const resolvedMissionId = missionId ?? latestMissionId(cwd, manifest);

  if (!resolvedMissionId) {
    fail("No mission state found. Start one with: context-kit mission start <goal>");
    process.exit(1);
  }

  const pendingFindings = [...simulatedFindings];
  const configuredExecution = manifestMissionExecution(manifest, validator);
  const workerCommands =
    cliWorkerCommands.length > 0 ? cliWorkerCommands : configuredExecution.workerCommands;
  const validateCommands =
    cliValidateCommands.length > 0 ? cliValidateCommands : configuredExecution.validateCommands;
  let injectedFindings = false;

  const result: MissionLoopResult = await runMissionLoop(cwd, {
    missionId: resolvedMissionId,
    config: configuredStateDir ? { stateDir: configuredStateDir } : undefined,
    maxIterations,
    worker: ({ slice }: MissionWorkerContext) => {
      if (slice.kind === "plan") {
        return {
          status: "completed",
          summary: `Auto-completed ${slice.kind} slice: ${slice.title}`,
        };
      }

      if (workerCommands.length === 0) {
        return {
          status: "completed",
          summary: `Auto-completed ${slice.kind} slice: ${slice.title}`,
        };
      }

      const commandResults = runMissionCommands(workerCommands, cwd);
      const failures = commandResults.filter((command) => command.exitCode !== 0);
      return {
        status: failures.length > 0 ? "failed" : "completed",
        summary:
          failures.length > 0
            ? `Worker commands failed for ${slice.title}`
            : `Executed ${workerCommands.length} worker command(s) for ${slice.title}`,
        commands: commandResults.map(({ command, exitCode }) => ({ command, exitCode })),
        issues: failures.map(
          (failure) => `${failure.command}: ${failure.output ?? `exit ${failure.exitCode}`}`,
        ),
      };
    },
    validator: ({ slice }: MissionValidatorContext) => {
      const commandResults =
        validateCommands.length > 0 ? runMissionCommands(validateCommands, cwd) : [];
      const commandFailures = commandResults.filter((command) => command.exitCode !== 0);
      const failedChecks = !injectedFindings ? pendingFindings.splice(0) : [];
      failedChecks.push(
        ...commandFailures.map(
          (failure) => `${failure.command}: ${failure.output ?? `exit ${failure.exitCode}`}`,
        ),
      );
      injectedFindings = true;
      return createValidatorResult({
        runId: `${resolvedMissionId}-${slice.id}-${Date.now()}`,
        validator,
        summary:
          failedChecks.length > 0
            ? `Validator found ${failedChecks.length} issue(s)`
            : validateCommands.length > 0
              ? `Validated with ${validateCommands.length} command(s)`
              : "Auto-validator passed",
        failedChecks,
        relatedSliceId: slice.dependsOn?.[0],
      });
    },
  });

  console.log(`Mission: ${result.state.id}`);
  console.log(`Loop reason: ${result.reason}`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Status: ${result.state.status}`);
  if (workerCommands.length > 0) console.log(`Worker commands: ${workerCommands.length}`);
  if (validateCommands.length > 0) console.log(`Validator commands: ${validateCommands.length}`);
  console.log(
    `Completed slices: ${result.state.plan.slices.filter((slice: { status: string }) => slice.status === "completed").length}/${result.state.plan.slices.length}`,
  );
  console.log(
    `Open findings: ${result.state.findings.filter((finding: { status: string }) => finding.status === "open").length}`,
  );
  const timeline = missionRunTimeline(result.state.events);
  if (timeline.length > 0) {
    console.log("Timeline:");
    timeline.forEach((line) => console.log(line));
  }
}

export function cmdHelp() {
  console.log(`
  context-kit <command>

  Commands:
    init              Scaffold docs/agent/ structure in this project
    enable-mission    Add the optional mission workflow to an existing classic project
    setup             Auto-scan project and fill all template sections (no prompts)
    sync              Update engine regions in existing files
    check             Validate required files, L0 token hints, CLAUDE.md size hints
    list              List available prompts and features
    new-spec <name>   Scaffold a new feature spec and add it to the manifest registry
    mission start     Create a local mission state file from a goal or --issue <number>
    mission status    Show the latest mission summary or a specific mission id
    mission run       Execute the autonomous planner -> worker -> validator loop locally
    mission validate  Record a validator result and create repair slices for failures

  Options:
    --help  Show this help
`);
}

// ── Setup: auto-detection helpers ────────────────────────────────────────────

export interface DetectedInfo {
  name: string;
  language: string;
  stack: string[];
}

/** Auto-detect project name, language, and stack from common project files. */
export function detectProjectInfo(cwd: string): DetectedInfo {
  let name = "my-project";
  let language = "typescript";
  const stack: string[] = [];

  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.name) name = pkg.name;
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      language = deps["typescript"] ? "typescript" : "javascript";
      if (deps["react"]) stack.push("react");
      if (deps["next"]) stack.push("nextjs");
      if (deps["vue"]) stack.push("vue");
      if (deps["svelte"]) stack.push("svelte");
      if (deps["express"]) stack.push("express");
      if (deps["fastify"]) stack.push("fastify");
      if (deps["hono"]) stack.push("hono");
      if (deps["prisma"] || deps["@prisma/client"]) stack.push("prisma");
      if (deps["drizzle-orm"]) stack.push("drizzle");
      if (deps["postgres"] || deps["pg"] || deps["@neondatabase/serverless"])
        stack.push("postgres");
      if (deps["mysql2"]) stack.push("mysql");
      if (deps["mongoose"]) stack.push("mongodb");
      if (deps["redis"] || deps["ioredis"]) stack.push("redis");
    } catch {
      /* ignore parse errors */
    }
  }

  if (existsSync(join(cwd, "go.mod"))) {
    language = "go";
    if (name === "my-project") {
      try {
        const mod = readFileSync(join(cwd, "go.mod"), "utf8");
        const m = mod.match(/^module (.+)/m);
        if (m) name = m[1].split("/").pop() ?? name;
      } catch {
        /* ignore */
      }
    }
  }

  if (existsSync(join(cwd, "pyproject.toml")) || existsSync(join(cwd, "setup.py"))) {
    language = "python";
  }

  if (existsSync(join(cwd, "Cargo.toml"))) {
    language = "rust";
    try {
      const cargo = readFileSync(join(cwd, "Cargo.toml"), "utf8");
      const m = cargo.match(/^name\s*=\s*"([^"]+)"/m);
      if (m) name = m[1];
    } catch {
      /* ignore */
    }
  }

  if (existsSync(join(cwd, "pom.xml"))) language = "java";
  if (existsSync(join(cwd, "build.gradle")) || existsSync(join(cwd, "build.gradle.kts"))) {
    language = "kotlin";
  }

  if (name === "my-project") {
    name = cwd.split("/").pop() ?? name;
  }

  return { name, language, stack };
}

/** Auto-detect project description from package.json or README. */
export function autoDetectDescription(cwd: string, info: DetectedInfo): string {
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (pkg.description) return pkg.description;
    } catch {
      /* ignore */
    }
  }

  for (const name of ["README.md", "readme.md", "Readme.md"]) {
    const p = join(cwd, name);
    if (existsSync(p)) {
      try {
        for (const line of readFileSync(p, "utf8").split("\n")) {
          const t = line.trim();
          if (
            t &&
            !t.startsWith("#") &&
            !t.startsWith("!") &&
            !t.startsWith("[") &&
            t.length > 20
          ) {
            return t.slice(0, 250);
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  const stackStr = info.stack.length > 0 ? ` built with ${info.stack.join(", ")}` : "";
  return `${info.name} — a ${info.language} project${stackStr}.`;
}

/** Scan common source directories and map them to human descriptions. */
export function autoDetectSourcePaths(cwd: string): Array<{ path: string; desc: string }> {
  const known: Array<[string, string]> = [
    ["src/app", "application entry & routing"],
    ["src/api", "API route handlers"],
    ["src/routes", "route definitions"],
    ["src/handlers", "request handlers"],
    ["src/controllers", "MVC controllers"],
    ["src/services", "business logic services"],
    ["src/models", "data models"],
    ["src/db", "database layer"],
    ["src/repositories", "data access repositories"],
    ["src/lib", "shared library code"],
    ["src/utils", "utility functions"],
    ["src/helpers", "helper functions"],
    ["src/hooks", "React hooks"],
    ["src/components", "UI components"],
    ["src/pages", "page components"],
    ["src/store", "state management"],
    ["src/types", "TypeScript type definitions"],
    ["src/config", "configuration"],
    ["src", "main source code"],
    ["app", "application code"],
    ["lib", "library code"],
    ["pkg", "Go packages"],
    ["cmd", "Go CLI commands"],
    ["internal", "internal packages"],
  ];
  const results: Array<{ path: string; desc: string }> = [];
  const added = new Set<string>();
  for (const [rel, desc] of known) {
    if (existsSync(join(cwd, rel)) && !added.has(rel)) {
      // Skip parent if a child is already included
      const isParentCovered = results.some((r) => r.path.startsWith(rel + "/"));
      if (!isParentCovered) {
        results.push({ path: rel, desc });
        added.add(rel);
      }
    }
    if (results.length >= 10) break;
  }
  return results;
}

/** Extract glossary terms from package.json keywords and README headings. */
export function autoDetectGlossaryTerms(
  cwd: string,
  info: DetectedInfo,
): Array<{ term: string; def: string }> {
  const terms: Array<{ term: string; def: string }> = [];
  const seen = new Set<string>();

  const add = (term: string, def: string) => {
    const key = term.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      terms.push({ term, def });
    }
  };

  // From package.json keywords
  const pkgPath = join(cwd, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (Array.isArray(pkg.keywords)) {
        for (const kw of pkg.keywords.slice(0, 6)) add(String(kw), "");
      }
    } catch {
      /* ignore */
    }
  }

  // From README ## headings (skip generic ones)
  const skip = new Set([
    "installation",
    "usage",
    "license",
    "contributing",
    "getting started",
    "overview",
    "features",
    "requirements",
    "setup",
    "development",
    "api",
    "table of contents",
    "roadmap",
    "changelog",
    "acknowledgements",
  ]);
  for (const readmeName of ["README.md", "readme.md"]) {
    const p = join(cwd, readmeName);
    if (existsSync(p)) {
      try {
        const lines = readFileSync(p, "utf8").split("\n");
        for (const line of lines) {
          const m = line.match(/^#{2,3}\s+(.+)/);
          if (m) {
            const term = m[1].trim().replace(/[`*_]/g, "");
            if (term.length < 40 && !skip.has(term.toLowerCase())) add(term, "");
          }
          if (terms.length >= 12) break;
        }
      } catch {
        /* ignore */
      }
      break;
    }
  }

  // Add stack terms with short definitions
  const stackDefs: Record<string, string> = {
    react: "UI component library",
    nextjs: "React framework with SSR/SSG",
    vue: "progressive UI framework",
    svelte: "compile-time UI framework",
    express: "Node.js HTTP server framework",
    fastify: "fast Node.js HTTP server",
    hono: "edge-first HTTP framework",
    prisma: "type-safe ORM",
    drizzle: "lightweight SQL ORM",
    postgres: "relational database",
    mongodb: "document database",
    redis: "in-memory key-value store",
  };
  for (const s of info.stack) {
    if (stackDefs[s]) add(s, stackDefs[s]);
    if (terms.length >= 12) break;
  }

  return terms;
}

/** Generate opinionated rules from the detected stack. */
export function autoDetectProjectRules(info: DetectedInfo): string[] {
  const rules: string[] = [];
  if (info.stack.includes("prisma")) {
    rules.push(
      "All DB queries through repository layer — no Prisma client calls outside repositories",
    );
    rules.push("Use Prisma migrations for schema changes, no manual SQL DDL");
  }
  if (info.stack.includes("drizzle")) {
    rules.push("Define schema in drizzle schema files; no raw SQL DDL elsewhere");
  }
  if (info.stack.includes("nextjs")) {
    rules.push(
      "Prefer React Server Components; use Client Components only when interactivity requires it",
    );
    rules.push("Keep server actions in dedicated files under app/**/actions.ts");
  } else if (info.stack.includes("react")) {
    rules.push("Components must be functional — no class components");
    rules.push("Encapsulate reusable logic in custom hooks (use* prefix)");
  }
  if (info.language === "typescript") {
    rules.push("No `any` type — use proper types or `unknown` with narrowing");
    rules.push("Enable strict mode in tsconfig");
  }
  const hasServer = ["express", "fastify", "hono"].some((s) => info.stack.includes(s));
  if (hasServer) {
    rules.push("Validate all incoming request data at route boundaries (zod or equivalent)");
    rules.push("Never expose raw error messages or stack traces to API consumers");
  }
  if (info.language === "go") {
    rules.push("Return errors explicitly — no panic in library code");
    rules.push("Use interfaces to decouple packages");
  }
  if (info.language === "python") {
    rules.push("Type-annotate all public functions and classes");
    rules.push("Use virtual environments; pin dependencies in requirements.txt or pyproject.toml");
  }
  if (rules.length === 0) {
    rules.push(`Follow ${info.language} idioms and community conventions`);
    rules.push("Keep functions small and single-purpose");
    rules.push("Write tests for business-critical paths");
  }
  return rules;
}

/** Compose an architecture overview sentence from detected project info. */
export function autoGenerateArchOverview(
  info: DetectedInfo,
  description: string,
  sourcePaths: Array<{ path: string; desc: string }>,
): string {
  // If description is meaningful enough, use it as basis
  if (description && !description.startsWith(info.name + " — a ") && description.length > 30) {
    return description;
  }
  let overview = `${info.name} is a ${info.language} project`;
  if (info.stack.includes("nextjs")) {
    overview = `${info.name} is a Next.js application (App Router).`;
  } else if (info.stack.includes("react") && info.stack.includes("express")) {
    overview = `${info.name} is a full-stack app: React frontend + Express API.`;
  } else if (info.stack.includes("react")) {
    overview = `${info.name} is a React application.`;
  } else if (info.stack.includes("vue")) {
    overview = `${info.name} is a Vue application.`;
  } else if (info.stack.includes("svelte")) {
    overview = `${info.name} is a Svelte application.`;
  } else {
    const server = ["hono", "fastify", "express"].find((s) => info.stack.includes(s));
    if (server) {
      overview = `${info.name} is a ${server} API server written in ${info.language}.`;
    } else if (info.language === "go") {
      overview = `${info.name} is a Go service.`;
    } else if (info.language === "python") {
      overview = `${info.name} is a Python application.`;
    } else if (info.language === "rust") {
      overview = `${info.name} is a Rust application.`;
    } else {
      overview = `${info.name} is a ${info.language} application.`;
    }
  }
  const orm = info.stack.includes("prisma")
    ? "Prisma"
    : info.stack.includes("drizzle")
      ? "Drizzle"
      : null;
  const db = info.stack.includes("postgres")
    ? "PostgreSQL"
    : info.stack.includes("mysql")
      ? "MySQL"
      : info.stack.includes("mongodb")
        ? "MongoDB"
        : null;
  if (orm && db) overview += ` Uses ${orm} with ${db}.`;
  else if (orm) overview += ` Uses ${orm} as ORM.`;
  else if (db) overview += ` Uses ${db}.`;
  if (info.stack.includes("redis")) overview += " Redis for caching/queuing.";
  return overview;
}

// ── Data model & backend auto-detection ──────────────────────────────────────

export interface DataModel {
  name: string;
  fields: string[];
}

/** Extract model names and fields from Prisma schema, Drizzle files, or Go structs. */
export function autoDetectDataModels(cwd: string): DataModel[] {
  const models: DataModel[] = [];

  // Prisma schema
  for (const candidate of ["prisma/schema.prisma", "schema.prisma"]) {
    const p = join(cwd, candidate);
    if (existsSync(p)) {
      try {
        const raw = readFileSync(p, "utf8");
        const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
        let m: RegExpExecArray | null;
        while ((m = modelRegex.exec(raw)) !== null) {
          const name = m[1];
          const fields = m[2]
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"))
            .map((l) => l.split(/\s+/).slice(0, 2).join(" "))
            .filter(Boolean)
            .slice(0, 8);
          models.push({ name, fields });
        }
      } catch {
        /* ignore */
      }
      break;
    }
  }

  // Drizzle — scan for pgTable / mysqlTable / sqliteTable calls
  if (models.length === 0) {
    const drizzleDirs = ["src/db", "src/schema", "db", "drizzle"];
    for (const dir of drizzleDirs) {
      const dirPath = join(cwd, dir);
      if (!existsSync(dirPath)) continue;
      try {
        for (const file of readdirSync(dirPath)) {
          if (!/\.(ts|js)$/.test(file)) continue;
          const raw = readFileSync(join(dirPath, file), "utf8");
          const tableRegex = /(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*["'](\w+)["']/g;
          let m: RegExpExecArray | null;
          while ((m = tableRegex.exec(raw)) !== null) {
            if (!models.find((mo) => mo.name === m![1])) {
              models.push({ name: m[1], fields: [] });
            }
          }
        }
      } catch {
        /* ignore */
      }
      if (models.length > 0) break;
    }
  }

  // Go structs — scan *.go files in model/models directories
  if (models.length === 0) {
    for (const dir of ["models", "model", "internal/models", "pkg/models"]) {
      const dirPath = join(cwd, dir);
      if (!existsSync(dirPath)) continue;
      try {
        for (const file of readdirSync(dirPath)) {
          if (!file.endsWith(".go")) continue;
          const raw = readFileSync(join(dirPath, file), "utf8");
          const structRegex = /type\s+(\w+)\s+struct\s*\{([^}]+)\}/g;
          let m: RegExpExecArray | null;
          while ((m = structRegex.exec(raw)) !== null) {
            const name = m[1];
            const fields = m[2]
              .split("\n")
              .map((l) => l.trim())
              .filter((l) => l && !l.startsWith("//"))
              .map((l) => l.split(/\s+/).slice(0, 2).join(" "))
              .filter(Boolean)
              .slice(0, 8);
            models.push({ name, fields });
          }
        }
      } catch {
        /* ignore */
      }
      if (models.length > 0) break;
    }
  }

  // Python — scan for SQLAlchemy class definitions
  if (models.length === 0) {
    for (const dir of ["models", "app/models", "src/models"]) {
      const dirPath = join(cwd, dir);
      if (!existsSync(dirPath)) continue;
      try {
        for (const file of readdirSync(dirPath)) {
          if (!file.endsWith(".py")) continue;
          const raw = readFileSync(join(dirPath, file), "utf8");
          const classRegex = /class\s+(\w+)\s*\([^)]*Base[^)]*\)/g;
          let m: RegExpExecArray | null;
          while ((m = classRegex.exec(raw)) !== null) {
            if (!models.find((mo) => mo.name === m![1])) {
              models.push({ name: m[1], fields: [] });
            }
          }
        }
      } catch {
        /* ignore */
      }
      if (models.length > 0) break;
    }
  }

  return models.slice(0, 12);
}

export interface BackendRoute {
  method: string;
  path: string;
  handler?: string;
}

/** Scan common patterns to extract HTTP route definitions. */
export function autoDetectBackendRoutes(cwd: string): BackendRoute[] {
  const routes: BackendRoute[] = [];
  const methods = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "router.get",
    "router.post",
    "router.put",
    "router.patch",
    "router.delete",
    "app.get",
    "app.post",
    "app.put",
    "app.patch",
    "app.delete",
  ];

  // JS/TS: Express/Fastify/Hono — scan src/routes, src/api, src/handlers
  const jsDirs = [
    "src/routes",
    "src/api",
    "src/handlers",
    "src/controllers",
    "app/routes",
    "routes",
    "api",
  ];
  for (const dir of jsDirs) {
    const dirPath = join(cwd, dir);
    if (!existsSync(dirPath)) continue;
    try {
      for (const file of readdirSync(dirPath)) {
        if (!/\.(ts|js)$/.test(file)) continue;
        const raw = readFileSync(join(dirPath, file), "utf8");
        // Match .get('/path', ...) or .post('/path', ...)
        const routeRegex = /\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
        let m: RegExpExecArray | null;
        while ((m = routeRegex.exec(raw)) !== null) {
          routes.push({ method: m[1].toUpperCase(), path: m[2] });
          if (routes.length >= 20) break;
        }
        if (routes.length >= 20) break;
      }
    } catch {
      /* ignore */
    }
    if (routes.length >= 20) break;
  }

  // Go: scan for http.HandleFunc or gin/chi router calls
  if (routes.length === 0) {
    for (const dir of ["cmd", "internal", "."]) {
      const dirPath = join(cwd, dir);
      if (!existsSync(dirPath)) continue;
      try {
        for (const file of readdirSync(dirPath)) {
          if (!file.endsWith(".go")) continue;
          const raw = readFileSync(join(dirPath, file), "utf8");
          const goRouteRegex = /\.(GET|POST|PUT|PATCH|DELETE|HandleFunc)\s*\(\s*"([^"]+)"/g;
          let m: RegExpExecArray | null;
          while ((m = goRouteRegex.exec(raw)) !== null) {
            const method = m[1] === "HandleFunc" ? "ANY" : m[1];
            routes.push({ method, path: m[2] });
            if (routes.length >= 20) break;
          }
          if (routes.length >= 20) break;
        }
      } catch {
        /* ignore */
      }
      if (routes.length >= 20) break;
    }
  }

  // Python: scan for FastAPI/Flask decorators
  if (routes.length === 0) {
    for (const dir of ["app", "api", "routes", "src"]) {
      const dirPath = join(cwd, dir);
      if (!existsSync(dirPath)) continue;
      try {
        for (const file of readdirSync(dirPath)) {
          if (!file.endsWith(".py")) continue;
          const raw = readFileSync(join(dirPath, file), "utf8");
          const pyRouteRegex =
            /@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;
          let m: RegExpExecArray | null;
          while ((m = pyRouteRegex.exec(raw)) !== null) {
            routes.push({ method: m[1].toUpperCase(), path: m[2] });
            if (routes.length >= 20) break;
          }
          if (routes.length >= 20) break;
        }
      } catch {
        /* ignore */
      }
      if (routes.length >= 20) break;
    }
  }

  return routes;
}

/** Generate project-specific context-policy loading rules from the detected stack. */
export function autoGenerateContextPolicyRules(
  info: DetectedInfo,
  sourcePaths: Array<{ path: string; desc: string }>,
  dataModels: DataModel[],
): string[] {
  const rules: string[] = [];

  // Always load architecture-primer before touching core structure
  rules.push("Always load `docs/agent/architecture-primer.md` before making structural changes.");

  // Data model context
  if (dataModels.length > 0) {
    const schemaRef = existsSync("prisma/schema.prisma")
      ? "`prisma/schema.prisma`"
      : "the data model section of `docs/agent/architecture-primer.md`";
    rules.push(`For any data model change, load ${schemaRef} first.`);
  }

  // Stack-specific
  if (info.stack.includes("nextjs")) {
    rules.push(
      "For page/route changes: load the relevant feature spec from `docs/features/` before editing App Router files.",
    );
    rules.push(
      "For server actions: check `docs/agent/architecture-primer.md` § Backend routes before adding new actions.",
    );
  } else if (info.stack.includes("react")) {
    rules.push(
      "For component changes: load the feature spec for the affected area from `docs/features/`.",
    );
  }

  const hasServer = ["express", "fastify", "hono"].some((s) => info.stack.includes(s));
  if (hasServer) {
    rules.push(
      "For API endpoint changes: load `docs/agent/architecture-primer.md` § Backend routes to understand existing surface.",
    );
  }

  if (info.stack.includes("prisma") || info.stack.includes("drizzle")) {
    rules.push(
      "For migration tasks: load the current schema file and check `docs/agent/key-learnings.md` for past migration pitfalls.",
    );
  }

  if (info.language === "go") {
    rules.push(
      "For package changes: load the relevant package docs under `internal/` or `pkg/` before modifying exported interfaces.",
    );
  }

  if (info.language === "python") {
    rules.push(
      "For model changes: load the SQLAlchemy models file before modifying relationships.",
    );
  }

  // Source path hints
  const apiPath = sourcePaths.find((p) => p.path.includes("api") || p.path.includes("routes"));
  if (apiPath) {
    rules.push(
      `API handlers live in \`${apiPath.path}\` — load this context for route-level changes.`,
    );
  }
  const servicePath = sourcePaths.find((p) => p.path.includes("service"));
  if (servicePath) {
    rules.push(
      `Business logic lives in \`${servicePath.path}\` — load before implementing domain features.`,
    );
  }

  return rules;
}

/** Generate initial key learnings from common stack-specific pitfalls. */
export function autoGenerateKeyLearnings(info: DetectedInfo): string[] {
  const learnings: string[] = [];

  if (info.language === "typescript") {
    learnings.push(
      "TypeScript `any` silently bypasses type safety — use `unknown` + narrowing or proper generics instead.",
    );
    learnings.push(
      "Forgetting `await` on async calls causes subtle bugs; TypeScript won't always warn without `@typescript-eslint/no-floating-promises`.",
    );
  }

  if (info.stack.includes("nextjs")) {
    learnings.push(
      "Next.js App Router: mixing Server and Client Components without explicit `'use client'` boundaries causes hydration errors.",
    );
    learnings.push(
      "Server Actions are not automatically protected — add authorization checks inside every action.",
    );
    learnings.push(
      "`cookies()` and `headers()` in Next.js are async in v15+ — always `await` them.",
    );
  } else if (info.stack.includes("react")) {
    learnings.push(
      "Stale closure bug: event handlers inside `useEffect` capture initial state unless added to the dependency array.",
    );
    learnings.push(
      "Direct state mutation (e.g. `state.items.push(x)`) does not trigger re-renders — always return a new object/array.",
    );
  }

  if (info.stack.includes("prisma")) {
    learnings.push(
      "Prisma: never edit a past migration file — always generate a new migration with `prisma migrate dev`.",
    );
    learnings.push(
      "N+1 queries are silent with Prisma — always use `include`/`select` to eager-load relations instead of accessing them in a loop.",
    );
  }

  if (info.stack.includes("drizzle")) {
    learnings.push(
      "Drizzle: schema changes must be reflected in migration files — running `drizzle-kit generate` is mandatory before `push`.",
    );
  }

  if (
    info.stack.includes("express") ||
    info.stack.includes("fastify") ||
    info.stack.includes("hono")
  ) {
    learnings.push(
      "Unhandled promise rejections in route handlers crash the server — always `try/catch` or use an async wrapper.",
    );
    learnings.push(
      "Never return raw error messages or stack traces in API responses — log internally, respond with a safe message.",
    );
  }

  if (info.stack.includes("redis")) {
    learnings.push(
      "Redis keys without TTL accumulate indefinitely — always set an expiry on cache keys.",
    );
  }

  if (info.language === "go") {
    learnings.push(
      "Go: ignoring returned errors (`_ = fn()`) hides failures — always handle or explicitly log errors.",
    );
    learnings.push(
      "Goroutine leaks are common when channels are never closed — use `context.Context` for cancellation.",
    );
  }

  if (info.language === "python") {
    learnings.push(
      "Mutable default arguments (`def f(x=[])`) are shared across calls — use `None` as default and initialize inside.",
    );
    learnings.push(
      "SQLAlchemy lazy-loading in async contexts raises `MissingGreenlet` — use `selectinload` or `joinedload` explicitly.",
    );
  }

  if (learnings.length === 0) {
    learnings.push("Add learnings here as you discover pitfalls specific to this codebase.");
  }

  return learnings;
}

/** Replace the content of a project region in a file's string. */
export function replaceProjectRegion(content: string, newContent: string): string {
  const start = "<!-- agent-context-kit:project:start -->";
  const end = "<!-- agent-context-kit:project:end -->";
  const regex =
    /<!-- agent-context-kit:project:start -->[\s\S]*?<!-- agent-context-kit:project:end -->/;
  if (!regex.test(content)) return content;
  return content.replace(regex, `${start}\n${newContent}\n${end}`);
}

/**
 * Fully automatic setup — scans the project and fills all template regions
 * without asking the user anything.
 */
export async function cmdSetup(cwd: string = process.cwd()): Promise<void> {
  const manifestPath = join(cwd, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    fail("manifest.yaml not found. Run: context-kit init first");
    process.exit(1);
  }

  log("Scanning project context...");

  const detected = detectProjectInfo(cwd);
  const description = autoDetectDescription(cwd, detected);
  const sourcePaths = autoDetectSourcePaths(cwd);
  const glossaryTerms = autoDetectGlossaryTerms(cwd, detected);
  const projectRules = autoDetectProjectRules(detected);
  const archOverview = autoGenerateArchOverview(detected, description, sourcePaths);
  const dataModels = autoDetectDataModels(cwd);
  const backendRoutes = autoDetectBackendRoutes(cwd);

  log(`  name     : ${detected.name}`);
  log(
    `  language : ${detected.language}${detected.stack.length ? " / " + detected.stack.join(", ") : ""}`,
  );
  log(`  overview : ${archOverview}`);
  if (dataModels.length > 0) log(`  models   : ${dataModels.map((m) => m.name).join(", ")}`);
  if (backendRoutes.length > 0) log(`  routes   : ${backendRoutes.length} detected`);
  console.log("");

  // ── Update manifest.yaml ──────────────────────────────────────────────────
  try {
    let raw = readFileSync(manifestPath, "utf8");
    raw = raw.replace(/name:\s*"[^"]*"/, `name: "${detected.name}"`);
    raw = raw.replace(
      /description:\s*"[^"]*"/,
      `description: "${description.replace(/"/g, '\\"')}"`,
    );
    raw = raw.replace(/language:\s*"[^"]*"/, `language: "${detected.language}"`);
    if (detected.stack.length > 0) {
      raw = raw.replace(
        /stack:\s*\[\]/,
        `stack: [${detected.stack.map((s) => `"${s}"`).join(", ")}]`,
      );
    }
    writeFileSync(manifestPath, raw);
    ok("manifest.yaml");
  } catch (e) {
    fail(`Could not update manifest.yaml: ${(e as Error).message}`);
  }

  // ── Update architecture-primer.md ─────────────────────────────────────────
  const archPath = join(cwd, "docs/agent/architecture-primer.md");
  if (existsSync(archPath)) {
    try {
      let content = readFileSync(archPath, "utf8");
      const pathLines = sourcePaths.map((p) => `- \`${p.path}\` — ${p.desc}`).join("\n");

      // Data model section
      let dataModelSection = "";
      if (dataModels.length > 0) {
        const modelRows = dataModels.map((m) => {
          const fieldStr = m.fields.length > 0 ? m.fields.join(", ") : "—";
          return `| \`${m.name}\` | ${fieldStr} |`;
        });
        dataModelSection = `## Data model\n\n| Model | Key fields |\n|-------|------------|\n${modelRows.join("\n")}`;
      }

      // Backend routes section
      let routesSection = "";
      if (backendRoutes.length > 0) {
        const routeRows = backendRoutes.map((r) => `| \`${r.method}\` | \`${r.path}\` |`);
        routesSection = `## Backend routes\n\n| Method | Path |\n|--------|------|\n${routeRows.join("\n")}`;
      }

      const sections = [
        `## Overview\n\n${archOverview}`,
        sourcePaths.length > 0 ? `## Key paths\n\n${pathLines}` : "",
        dataModelSection,
        routesSection,
      ]
        .filter(Boolean)
        .join("\n\n");
      content = replaceProjectRegion(content, "\n" + sections + "\n");
      writeFileSync(archPath, content);
      ok("docs/agent/architecture-primer.md");
    } catch (e) {
      fail(`Could not update architecture-primer.md: ${(e as Error).message}`);
    }
  }

  // ── Update glossary.md ────────────────────────────────────────────────────
  // Merge auto-detected terms with model names as domain terms
  const glossaryPath = join(cwd, "docs/agent/glossary.md");
  if (existsSync(glossaryPath)) {
    try {
      let content = readFileSync(glossaryPath, "utf8");
      const allTerms = [...glossaryTerms];
      // Add data model names as domain terms if not already present
      const existingKeys = new Set(allTerms.map((t) => t.term.toLowerCase()));
      for (const m of dataModels) {
        if (!existingKeys.has(m.name.toLowerCase())) {
          const fields = m.fields.slice(0, 3).join(", ");
          allTerms.push({
            term: m.name,
            def: fields ? `data model — fields: ${fields}` : "data model",
          });
          existingKeys.add(m.name.toLowerCase());
        }
      }
      if (allTerms.length > 0) {
        const rows = allTerms.map((t) => `| ${t.term} | ${t.def} |`);
        const table = ["| Term | Definition |", "|------|------------|", ...rows].join("\n");
        content = replaceProjectRegion(content, "\n" + table + "\n");
      }
      writeFileSync(glossaryPath, content);
      ok("docs/agent/glossary.md");
    } catch (e) {
      fail(`Could not update glossary.md: ${(e as Error).message}`);
    }
  }

  // ── Update values.md project section ─────────────────────────────────────
  const valuesPath = join(cwd, "docs/agent/values.md");
  if (existsSync(valuesPath)) {
    try {
      let content = readFileSync(valuesPath, "utf8");
      const rulesBlock = projectRules.map((r) => `- ${r}`).join("\n");
      const newRegion = `\n## Project-specific rules\n\n${rulesBlock}\n`;
      content = replaceProjectRegion(content, newRegion);
      writeFileSync(valuesPath, content);
      ok("docs/agent/values.md");
    } catch (e) {
      fail(`Could not update values.md: ${(e as Error).message}`);
    }
  }

  // ── Update context-policy.md project section ─────────────────────────────
  const ctxPolicyPath = join(cwd, "docs/agent/context-policy.md");
  if (existsSync(ctxPolicyPath)) {
    try {
      let content = readFileSync(ctxPolicyPath, "utf8");
      const ctxRules = autoGenerateContextPolicyRules(detected, sourcePaths, dataModels);
      if (ctxRules.length > 0) {
        const block = ctxRules.map((r) => `- ${r}`).join("\n");
        const region = `\n## Project-specific additions\n\n${block}\n`;
        content = replaceProjectRegion(content, region);
        writeFileSync(ctxPolicyPath, content);
        ok("docs/agent/context-policy.md");
      }
    } catch (e) {
      fail(`Could not update context-policy.md: ${(e as Error).message}`);
    }
  }

  // ── Update key-learnings.md project section ───────────────────────────────
  const learningsPath = join(cwd, "docs/agent/key-learnings.md");
  if (existsSync(learningsPath)) {
    try {
      let content = readFileSync(learningsPath, "utf8");
      const learnings = autoGenerateKeyLearnings(detected);
      if (learnings.length > 0) {
        const block = learnings.map((l) => `- ${l}`).join("\n");
        const region = `\n## Initial learnings (auto-generated — refine as you go)\n\n${block}\n`;
        content = replaceProjectRegion(content, region);
        writeFileSync(learningsPath, content);
        ok("docs/agent/key-learnings.md");
      }
    } catch (e) {
      fail(`Could not update key-learnings.md: ${(e as Error).message}`);
    }
  }

  // ── Update app-config.md project section ─────────────────────────────────
  const appConfigPath = join(cwd, "docs/agent/app-config.md");
  if (existsSync(appConfigPath)) {
    try {
      let content = readFileSync(appConfigPath, "utf8");
      const devCmd = existsSync(join(cwd, "package.json"))
        ? "npm run dev"
        : detected.language === "go"
          ? "go run ./cmd/..."
          : "make dev";
      const testCmd = existsSync(join(cwd, "package.json"))
        ? "npm test"
        : detected.language === "go"
          ? "go test ./..."
          : detected.language === "python"
            ? "pytest"
            : "make test";
      const lintCmd = existsSync(join(cwd, "package.json"))
        ? "npm run lint"
        : detected.language === "go"
          ? "golangci-lint run"
          : "make lint";
      const typeCmd =
        detected.language === "typescript"
          ? "npx tsc --noEmit"
          : detected.language === "python"
            ? "mypy ."
            : "—";
      const region =
        `\n## Identity\n\n` +
        `- **Project name:** \`${detected.name}\`\n` +
        `- **Primary language:** ${detected.language}${detected.stack.length ? " / " + detected.stack.join(", ") : ""}\n` +
        `- **Dev command:** \`${devCmd}\`\n` +
        `- **Test command:** \`${testCmd}\`\n` +
        `- **Lint command:** \`${lintCmd}\`\n` +
        `- **Type check:** \`${typeCmd}\`\n\n` +
        `## Paths\n\n` +
        `| What | Path |\n|------|------|\n` +
        `| Feature docs | \`docs/features/\` |\n` +
        `| Feature register | \`docs/README.md\` |\n` +
        `| Architecture primer | \`docs/agent/architecture-primer.md\` |\n` +
        `| Key learnings | \`docs/agent/key-learnings.md\` |\n` +
        `| Prompt templates | \`docs/agent/prompts/\` |\n` +
        `| Decisions / ADRs | \`docs/decisions/\` |\n\n` +
        `## Spec System\n\n` +
        `- Feature specs live in \`docs/features/\` (single file or folder + \`specs/\` for decision records)\n` +
        `- Scaffold a new spec: \`context-kit new-spec <name>\`\n` +
        `- Register every feature in \`docs/README.md\` feature register and \`manifest.yaml registry\`\n\n` +
        `## MCP Toolshed\n\n` +
        `Toolshed MCP is configured in \`.mcp.json\` (Claude Code) or \`.cursor/mcp.json\` (Cursor).\n\n` +
        `When available, prefer MCP tools over manually opening files:\n\n` +
        `| Task | Tool |\n|------|------|\n` +
        `| Orientation | \`get_project_identity\`, \`get_guardrails\` |\n` +
        `| Feature spec | \`list_registry\` → \`get_spec\` |\n` +
        `| Learnings | \`get_learnings\` |\n` +
        `| Glossary | \`lookup_glossary\` |\n` +
        `| Prompts | \`list_prompts\`, \`get_prompt\` |\n` +
        `| Search | \`search_context\` |\n`;
      content = replaceProjectRegion(content, region);
      writeFileSync(appConfigPath, content);
      ok("docs/agent/app-config.md");
    } catch (e) {
      fail(`Could not update app-config.md: ${(e as Error).message}`);
    }
  }

  // ── Update product-context.md project section ─────────────────────────────
  const productContextPath = join(cwd, "docs/agent/product-context.md");
  if (existsSync(productContextPath)) {
    try {
      let content = readFileSync(productContextPath, "utf8");
      const region =
        `\n## Target User\n\n` +
        `(Describe the primary user: role, technical level, use context.)\n\n` +
        `## Primary Device\n\n` +
        `(Describe the target device and viewport \u2014 e.g. "Desktop 1440px is the default.")\n\n` +
        `## Constraints\n\n` +
        `- (Add project-specific constraints)\n\n` +
        `## Non-Goals\n\n` +
        `- (Explicitly out of scope for this product)\n`;
      content = replaceProjectRegion(content, region);
      writeFileSync(productContextPath, content);
      ok("docs/agent/product-context.md");
    } catch (e) {
      fail(`Could not update product-context.md: ${(e as Error).message}`);
    }
  }

  // ── Update docs/README.md project name ───────────────────────────────────
  const docsReadmePath = join(cwd, "docs/README.md");
  if (existsSync(docsReadmePath)) {
    try {
      let content = readFileSync(docsReadmePath, "utf8");
      content = content.replace(/^# Project Documentation/m, `# ${detected.name} Documentation`);
      writeFileSync(docsReadmePath, content);
      ok("docs/README.md");
    } catch (e) {
      fail(`Could not update docs/README.md: ${(e as Error).message}`);
    }
  }

  // ── Update AGENTS.md (Codex) ─────────────────────────────────────────────
  const agentsPath = join(cwd, "AGENTS.md");
  if (existsSync(agentsPath)) {
    try {
      const rulesBlock = projectRules.map((r) => `- ${r}`).join("\n");
      const ctxBlock = [
        `- \`docs/README.md\` — reading order, task→prompt table, feature register`,
        `- \`docs/agent/values.md\` — non-negotiable rules`,
        `- \`docs/agent/app-config.md\` — package names, paths, MCP config`,
        `- \`docs/agent/architecture-primer.md\` — system map${dataModels.length > 0 ? ` (${dataModels.map((m) => m.name).join(", ")} models)` : ""}`,
        `- \`docs/agent/glossary.md\` — domain terms`,
      ].join("\n");
      const onDemandBlock = [
        `- \`docs/agent/context-policy.md\` — when to load what`,
        `- \`docs/agent/key-learnings.md\` — past pitfalls`,
        `- \`docs/features/<name>.md\` — load only the relevant feature spec`,
        ...(backendRoutes.length > 0
          ? [`- \`docs/agent/architecture-primer.md\` § Backend routes — before any API change`]
          : []),
      ].join("\n");
      const agentsContent =
        `# ${detected.name} — Agent Instructions\n\n` +
        `${description}\n\n` +
        `## Context — load at session start\n\n${ctxBlock}\n\n` +
        `## Context — load on demand\n\n${onDemandBlock}\n\n` +
        `## Project rules\n\n${rulesBlock}\n`;
      writeFileSync(agentsPath, agentsContent);
      ok("AGENTS.md");
    } catch (e) {
      fail(`Could not update AGENTS.md: ${(e as Error).message}`);
    }
  }

  // ── Generate MCP configs ──────────────────────────────────────────────────
  const mcpServerEntry = {
    command: "npx",
    args: ["-y", "@agent-context-kit/toolshed-server", "--manifest", join(cwd, "manifest.yaml")],
  };

  function writeMcpConfig(mcpPath: string, label: string) {
    try {
      writeWorkspaceMcpConfig(mcpPath, "toolshed", mcpServerEntry);
      ok(`${label}  (Toolshed MCP)`);
    } catch (e) {
      fail(`Could not write ${label}: ${(e as Error).message}`);
    }
  }

  // Cursor: .cursor/mcp.json
  const cursorMcpPath = join(cwd, ".cursor/mcp.json");
  if (existsSync(join(cwd, ".cursor"))) {
    writeMcpConfig(cursorMcpPath, ".cursor/mcp.json");
  }

  // Claude Code: .mcp.json (project-scoped)
  const claudeMcpPath = join(cwd, ".mcp.json");
  if (existsSync(join(cwd, "CLAUDE.md"))) {
    writeMcpConfig(claudeMcpPath, ".mcp.json       ");
  }

  // Codex: no standard MCP config file yet — print instructions
  if (
    existsSync(join(cwd, "AGENTS.md")) &&
    !existsSync(join(cwd, "CLAUDE.md")) &&
    !existsSync(join(cwd, ".cursor"))
  ) {
    log("Codex MCP: no standard config file yet. Start the server manually:");
    console.log("  npx @agent-context-kit/toolshed-server");
  }

  console.log("");
  log("Step 2 of 3 complete. Run next:");
  console.log("");
  console.log("  \x1b[1m3. Tell your AI agent (in your editor):\x1b[0m");
  console.log("");
  console.log("  \x1b[2mRead docs/agent/prompts/populate-project.md\x1b[0m");
  console.log("  \x1b[2mand populate all project docs.\x1b[0m");
  console.log("");
  console.log("  The agent will scan your codebase, fill all template files,");
  console.log("  then ask you 4 questions it can't infer from code.");
  console.log("");
  console.log("  After that: context-kit check");
  console.log("  Then open docs/README.md to start developing.");
}

// ── Router ────────────────────────────────────────────────────────────────────

// Only run as CLI entry point (not when imported by tests)
function resolveArgv1(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolveArgv1(process.argv[1])) {
  const [, , command] = process.argv;

  if (command === "--help" || command === "-h" || !command) {
    cmdHelp();
    process.exit(0);
  }

  switch (command) {
    case "init":
      cmdInit()
        .then(() => process.exit(0))
        .catch((e) => {
          fail((e as Error).message);
          process.exit(1);
        });
      break;
    case "setup":
      cmdSetup()
        .then(() => process.exit(0))
        .catch((e) => {
          fail((e as Error).message);
          process.exit(1);
        });
      break;
    case "sync":
      cmdSync();
      break;
    case "check":
      process.exit(cmdCheck());
      break;
    case "list":
      cmdList();
      break;
    case "new-spec":
      cmdNewSpec(process.argv[3]);
      break;
    case "enable-mission":
      cmdEnableMission();
      break;
    case "mission": {
      const subcommand = process.argv[3];
      if (subcommand === "start") {
        cmdMissionStart(process.argv.slice(4));
      } else if (subcommand === "status") {
        cmdMissionStatus(process.argv[4]);
      } else if (subcommand === "run") {
        await cmdMissionRun(process.argv.slice(4));
      } else if (subcommand === "validate") {
        cmdMissionValidate(process.argv.slice(4));
      } else {
        cmdHelp();
        process.exit(1);
      }
      break;
    }
    default:
      cmdHelp();
      break;
  }
}
