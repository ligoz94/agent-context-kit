/**
 * Spawns toolshed-server over stdio and exercises listTools + callTool (MCP client).
 * Run from repo root after build: npm run test:mcp -w @agent-context-kit/toolshed-server
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");
const serverJs = resolve(packageRoot, "dist/index.js");
const manifestPath = resolve(packageRoot, "..", "..", "template", "manifest.yaml");

function fail(msg) {
  console.error(`[smoke] FAIL: ${msg}`);
  process.exit(1);
}

if (!existsSync(serverJs)) {
  fail(`Missing ${serverJs} — run: npm run build -w @agent-context-kit/toolshed-server`);
}
if (!existsSync(manifestPath)) {
  fail(`Missing manifest at ${manifestPath}`);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverJs, "--manifest", manifestPath],
  stderr: "inherit",
});

const client = new Client({ name: "agent-context-kit-smoke", version: "0.0.0" }, { capabilities: {} });

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  if (names.length !== 8) {
    fail(`expected 8 tools, got ${names.length}: ${names.join(", ")}`);
  }
  const expected = [
    "get_learnings",
    "get_project_identity",
    "get_prompt",
    "get_rules",
    "get_spec",
    "list_prompts",
    "list_registry",
    "lookup_glossary",
  ];
  for (const n of expected) {
    if (!names.includes(n)) fail(`missing tool: ${n}`);
  }

  const idResult = await client.callTool({
    name: "get_project_identity",
    arguments: {},
  });
  if (idResult.isError) {
    fail(`get_project_identity returned isError: ${JSON.stringify(idResult.content)}`);
  }
  const text = idResult.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text.includes("## Values") || !text.includes("Non-negotiables")) {
    fail(`unexpected get_project_identity body (first 400 chars): ${text.slice(0, 400)}`);
  }

  const reg = await client.callTool({ name: "list_registry", arguments: {} });
  if (reg.isError) fail("list_registry isError");
  const regText = reg.content?.find((c) => c.type === "text")?.text ?? "";
  if (!regText.toLowerCase().includes("empty")) {
    fail(`list_registry expected empty-registry message, got: ${regText.slice(0, 200)}`);
  }

  console.log("[smoke] OK — listTools + callTool(get_project_identity, list_registry)");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await client.close().catch(() => {});
}
