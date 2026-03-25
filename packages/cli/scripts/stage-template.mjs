/**
 * Copy repo-root `template/` into `packages/cli/template/` before npm publish
 * so the published tarball includes manifests and docs for `context-kit init`.
 */
import { cpSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRootTemplate = join(__dirname, "../../../template");
const dest = join(__dirname, "../template");

if (!existsSync(repoRootTemplate)) {
  console.warn("[stage-template] ../../../template not found; skip (local pack only?)");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(repoRootTemplate, dest, { recursive: true, force: true });
console.log("[stage-template] Copied template → packages/cli/template");
