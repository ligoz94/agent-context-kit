#!/usr/bin/env node

/**
 * @agent-context-kit/cli
 *
 * Commands:
 *   context-kit init     — scaffold docs/agent/ in the current project
 *   context-kit sync     — update engine regions, preserve project regions
 *   context-kit check    — validate manifest, links, token budgets
 *   context-kit list     — list prompts and feature files
 *   context-kit new-spec — scaffold docs/features/<name>.md + registry entry
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "fs";
import { resolve, join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Published layout: `cli/template` next to `cli/dist`. Monorepo: repo root `template/`. */
export function findTemplateDir(): string {
  const candidates = [
    resolve(__dirname, "../template"),
    resolve(__dirname, "../../../template"),
  ];
  for (const c of candidates) {
    if (existsSync(join(c, "manifest.yaml"))) return c;
  }
  throw new Error(
    `Template not found. Tried:\n  ${candidates.join("\n  ")}`,
  );
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
  try {
    writeFileSync(dest, readFileSync(src, "utf8"));
    ok(`Created: ${relative(process.cwd(), dest)}`);
  } catch (e) {
    fail(`Cannot write file: ${dest} — ${(e as Error).message}`);
    throw e;
  }
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

export function cmdInit(cwd: string = process.cwd()) {
  let templateDir: string;
  try {
    templateDir = findTemplateDir();
  } catch (e) {
    fail((e as Error).message);
    process.exit(1);
  }

  log("Initialising agent-context-kit...");

  copyTemplate(join(templateDir, "manifest.yaml"), join(cwd, "manifest.yaml"));

  const agentFiles = [
    "values.md",
    "glossary.md",
    "architecture-primer.md",
    "context-policy.md",
    "key-learnings.md",
  ];

  ensureDir(join(cwd, "docs/agent/prompts"));
  ensureDir(join(cwd, "docs/agent/evals"));
  ensureDir(join(cwd, "docs/features"));
  ensureDir(join(cwd, "docs/human"));
  ensureDir(join(cwd, "docs/decisions"));
  ensureDir(join(cwd, ".cursor/rules"));

  for (const f of agentFiles) {
    copyTemplate(join(templateDir, "docs/agent", f), join(cwd, "docs/agent", f));
  }

  copyTemplateDirFiles(templateDir, "docs/agent/evals", cwd);

  copyTemplate(
    join(templateDir, "docs/features/_template.md"),
    join(cwd, "docs/features/_template.md"),
  );

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
    join(templateDir, ".cursor/rules/agent-context-kit.mdc"),
    join(cwd, ".cursor/rules/agent-context-kit.mdc"),
  );
  copyTemplate(join(templateDir, "CLAUDE.md"), join(cwd, "CLAUDE.md"));

  console.log("");
  log("Done. Next steps:");
  console.log("  1. Edit manifest.yaml — fill in your project name and stack");
  console.log("  2. Fill docs/agent/values.md with your non-negotiables");
  console.log("  3. Fill docs/agent/glossary.md with your project terms");
  console.log("  4. Wire MCP: docs/human/toolshed-mcp-setup.md");
  console.log("  5. Run: npx @agent-context-kit/toolshed-server");
}

export function cmdSync(cwd: string = process.cwd()) {
  let templateDir: string;
  try {
    templateDir = findTemplateDir();
  } catch (e) {
    fail((e as Error).message);
    process.exit(1);
  }

  log("Syncing engine regions...");

  const agentFiles = [
    "values.md",
    "glossary.md",
    "architecture-primer.md",
    "context-policy.md",
    "key-learnings.md",
  ];

  let synced = 0;
  for (const f of agentFiles) {
    const dest = join(cwd, "docs/agent", f);
    const src = join(templateDir, "docs/agent", f);
    if (!existsSync(src)) continue;
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

  if (synced === 0) {
    log("All engine regions are up to date.");
  } else {
    log(`${synced} file(s) updated. Project regions preserved.`);
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
    "docs/agent/values.md",
    "docs/agent/context-policy.md",
    "docs/agent/architecture-primer.md",
    "docs/agent/key-learnings.md",
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
    templateContent = templateContent.replace(
      /# Feature: <feature-name>/,
      `# Feature: ${name}`,
    );
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
      (f) => f.endsWith(".md") && !f.startsWith("_"),
    );
    console.log("\n  Features:");
    features.forEach((f) => console.log(`    - ${f.replace(".md", "")}`));
  }
}

export function cmdHelp() {
  console.log(`
  context-kit <command>

  Commands:
    init              Scaffold docs/agent/ structure in this project
    sync              Update engine regions in existing files
    check             Validate manifest and check required files
    list              List available prompts and features
    new-spec <name>   Scaffold a new feature spec and add it to the manifest registry

  Options:
    --help  Show this help
`);
}

// ── Router ────────────────────────────────────────────────────────────────────

// Only run as CLI entry point (not when imported by tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [, , command] = process.argv;

  if (command === "--help" || command === "-h" || !command) {
    cmdHelp();
    process.exit(0);
  }

  switch (command) {
    case "init":
      cmdInit();
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
    default:
      cmdHelp();
      break;
  }
}
