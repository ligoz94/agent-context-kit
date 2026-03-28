import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleGetProjectIdentity,
  handleGetRules,
  handleGetSpec,
  handleListRegistry,
  handleGetGuardrails,
  handleRequestHumanApproval,
  handleVerifyAction,
  Manifest,
} from "./handlers.js";
import fs from "fs";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  const mocks = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
  return {
    ...actual,
    ...mocks,
    default: { ...actual, ...mocks },
  };
});

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

global.fetch = vi.fn();

const mockRoot = "/tmp/mock-root";

describe("@agent-context-kit/toolshed-server/handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ── Existing tests ──────────────────────────────────────────────────────────

  describe("handleGetProjectIdentity", () => {
    it("returns err if no identity configured", () => {
      const res = handleGetProjectIdentity({}, mockRoot);
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("No identity files found");
    });

    it("returns concatenated content for configured identity files", () => {
      const manifest: Manifest = {
        identity: { values: "values.md", glossary: "glossary.md" },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (String(path).endsWith("values.md")) return "value_content";
        if (String(path).endsWith("glossary.md")) return "glossary_content";
        return "";
      });

      const res = handleGetProjectIdentity(manifest, mockRoot);
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("## Values");
      expect(res.content[0].text).toContain("value_content");
      expect(res.content[0].text).toContain("## Glossary");
      expect(res.content[0].text).toContain("glossary_content");
    });
  });

  describe("handleGetRules", () => {
    it("returns policy and all standards if no standard input", () => {
      const manifest: Manifest = {
        rules: {
          policy: "policy.md",
          standards: [{ name: "testing", path: "test.md" }],
        },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("content");

      const res = handleGetRules(manifest, mockRoot, {});
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("## Context policy");
      expect(res.content[0].text).toContain("## Standard: testing");
    });

    it("filters standard if standard input provided", () => {
      const manifest: Manifest = {
        rules: {
          standards: [
            { name: "testing", path: "test.md" },
            { name: "style", path: "style.md" },
          ],
        },
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("content");

      const res = handleGetRules(manifest, mockRoot, { standard: "testing" });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("## Standard: testing");
      expect(res.content[0].text).not.toContain("## Standard: style");
    });
  });

  describe("handleListRegistry", () => {
    it("returns empty message if no registry", () => {
      const res = handleListRegistry({});
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("Registry is empty");
    });

    it("lists registry entries", () => {
      const manifest: Manifest = {
        registry: [{ name: "feature_a", path: "a.md", status: "beta" }],
      };
      const res = handleListRegistry(manifest);
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("- **feature_a** (beta): a.md");
    });
  });

  describe("handleGetSpec", () => {
    it("returns error if feature not found", () => {
      const manifest: Manifest = { registry: [] };
      const res = handleGetSpec(manifest, mockRoot, { name: "unknown" });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("not found");
    });

    it("returns spec content if found", () => {
      const manifest: Manifest = {
        registry: [{ name: "feature_a", path: "a.md" }],
      };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("spec_content");

      const res = handleGetSpec(manifest, mockRoot, { name: "feature_a" });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("spec_content");
      expect(res.content[0].text).toContain("# Spec: feature_a");
    });
  });

  // ── New handler tests ───────────────────────────────────────────────────────

  describe("handleGetGuardrails", () => {
    it("returns a helpful message when no guardrails are configured", () => {
      const res = handleGetGuardrails({});
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("No guardrails configured");
    });

    it("returns a helpful message when guardrails section has no lists", () => {
      const manifest = { guardrails: {} } as Manifest;
      const res = handleGetGuardrails(manifest);
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("No guardrails configured");
    });

    it("formats blocked_actions correctly", () => {
      const manifest = {
        guardrails: { blocked_actions: ["DROP TABLE", "rm -rf"] },
      } as Manifest;
      const res = handleGetGuardrails(manifest);
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("Blocked Actions");
      expect(res.content[0].text).toContain("`DROP TABLE`");
      expect(res.content[0].text).toContain("`rm -rf`");
    });

    it("formats require_approval correctly", () => {
      const manifest = {
        guardrails: { require_approval: ["deploy to production", "send email"] },
      } as Manifest;
      const res = handleGetGuardrails(manifest);
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("Requires Human Approval");
      expect(res.content[0].text).toContain("`deploy to production`");
    });

    it("formats allowed_domains correctly", () => {
      const manifest = {
        guardrails: { allowed_domains: ["localhost", "staging.app.com"] },
      } as Manifest;
      const res = handleGetGuardrails(manifest);
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("Allowed Domains");
      expect(res.content[0].text).toContain("`localhost`");
    });

    it("renders all three sections when all are configured", () => {
      const manifest = {
        guardrails: {
          blocked_actions: ["rm -rf"],
          require_approval: ["deploy"],
          allowed_domains: ["localhost"],
        },
      } as Manifest;
      const res = handleGetGuardrails(manifest);
      expect(res.isError).toBeUndefined();
      const text = res.content[0].text;
      expect(text).toContain("Blocked Actions");
      expect(text).toContain("Requires Human Approval");
      expect(text).toContain("Allowed Domains");
    });
  });

  describe("handleRequestHumanApproval", () => {
    it("returns err if action is empty", () => {
      const res = handleRequestHumanApproval({ action: "", context: "ctx" });
      expect(res.isError).toBe(true);
    });

    it("returns err if context is empty", () => {
      const res = handleRequestHumanApproval({ action: "do thing", context: "" });
      expect(res.isError).toBe(true);
    });

    it("renders a structured approval request with default (medium) risk level", () => {
      const res = handleRequestHumanApproval({
        action: "deploy to production",
        context: "Releasing v2.0 after QA sign-off",
      });
      expect(res.isError).toBeUndefined();
      const text = res.content[0].text;
      expect(text).toContain("Human Approval Required");
      expect(text).toContain("deploy to production");
      expect(text).toContain("Releasing v2.0 after QA sign-off");
      expect(text).toContain("MEDIUM");
      expect(text).toContain("🟠");
      expect(text).toContain("APPROVED");
      expect(text).toContain("DENIED");
    });

    it("uses 🟡 LOW for low risk", () => {
      const res = handleRequestHumanApproval({ action: "a", context: "b", risk_level: "low" });
      expect(res.content[0].text).toContain("🟡");
      expect(res.content[0].text).toContain("LOW");
    });

    it("uses 🔴 HIGH for high risk", () => {
      const res = handleRequestHumanApproval({ action: "a", context: "b", risk_level: "high" });
      expect(res.content[0].text).toContain("🔴");
      expect(res.content[0].text).toContain("HIGH");
    });
  });

  describe("handleVerifyAction", () => {
    it("returns err when description is missing", async () => {
      const res = await handleVerifyAction(mockRoot, {
        description: "",
        checks: [{ type: "file_exists", path: "a.md" }],
      });
      expect(res.isError).toBe(true);
    });

    it("returns err when checks array is empty", async () => {
      const res = await handleVerifyAction(mockRoot, { description: "test", checks: [] });
      expect(res.isError).toBe(true);
    });

    it("passes file_exists when file is present", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const res = await handleVerifyAction(mockRoot, {
        description: "Created config file",
        checks: [{ type: "file_exists", path: "config.json" }],
      });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("ALL CHECKS PASSED");
      expect(res.content[0].text).toContain("✅");
    });

    it("fails file_exists when file is missing", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const res = await handleVerifyAction(mockRoot, {
        description: "Created config file",
        checks: [{ type: "file_exists", path: "config.json" }],
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("FAILED");
      expect(res.content[0].text).toContain("❌");
    });

    it("passes file_contains when string is present", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("hello world");
      const res = await handleVerifyAction(mockRoot, {
        description: "Wrote greeting",
        checks: [{ type: "file_contains", path: "out.txt", value: "hello world" }],
      });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("ALL CHECKS PASSED");
    });

    it("fails file_contains when string is absent", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("something else");
      const res = await handleVerifyAction(mockRoot, {
        description: "Wrote greeting",
        checks: [{ type: "file_contains", path: "out.txt", value: "hello world" }],
      });
      expect(res.isError).toBe(true);
    });

    it("passes file_modified_after when mtime is recent", async () => {
      const past = new Date(Date.now() - 10_000).toISOString();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as any);
      const res = await handleVerifyAction(mockRoot, {
        description: "Modified output",
        checks: [{ type: "file_modified_after", path: "out.txt", after: past }],
      });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("ALL CHECKS PASSED");
    });

    it("fails file_modified_after when mtime is older than threshold", async () => {
      const future = new Date(Date.now() + 10_000).toISOString();
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as any);
      const res = await handleVerifyAction(mockRoot, {
        description: "Modified output",
        checks: [{ type: "file_modified_after", path: "out.txt", after: future }],
      });
      expect(res.isError).toBe(true);
    });

    it("reports mixed results correctly when some checks pass and some fail", async () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(true)   // first check — file exists
        .mockReturnValueOnce(false); // second check — file missing

      const res = await handleVerifyAction(mockRoot, {
        description: "Multiple checks",
        checks: [
          { type: "file_exists", path: "a.md" },
          { type: "file_exists", path: "b.md" },
        ],
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("1 of 2 checks FAILED");
      expect(res.content[0].text).toContain("✅");
      expect(res.content[0].text).toContain("❌");
    });

    it("passes command_succeeds when command exits with 0", async () => {
      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockReturnValue(Buffer.from(""));
      const res = await handleVerifyAction(mockRoot, {
        description: "Ran build",
        checks: [{ type: "command_succeeds", command: "npm run build" }],
      });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("✅");
    });

    it("fails command_succeeds when command throws", async () => {
      const { execSync } = await import("child_process");
      vi.mocked(execSync).mockImplementation(() => { throw new Error("failed"); });
      const res = await handleVerifyAction(mockRoot, {
        description: "Ran build",
        checks: [{ type: "command_succeeds", command: "npm run build" }],
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("❌");
    });

    it("passes http_status when fetch returns expected code", async () => {
      vi.mocked(global.fetch).mockResolvedValue({ status: 200 } as any);
      const res = await handleVerifyAction(mockRoot, {
        description: "Checked API",
        checks: [{ type: "http_status", path: "http://localhost:3000", expected_status: 200 }],
      });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("✅");
    });

    it("fails http_status when fetch returns wrong code", async () => {
      vi.mocked(global.fetch).mockResolvedValue({ status: 404 } as any);
      const res = await handleVerifyAction(mockRoot, {
        description: "Checked API",
        checks: [{ type: "http_status", path: "http://localhost:3000", expected_status: 200 }],
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("❌");
    });

    it("passes json_contains when json path matches value", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ a: { b: "hello" } }));
      const res = await handleVerifyAction(mockRoot, {
        description: "Checked config",
        checks: [{ type: "json_contains", path: "config.json", json_path: "a.b", value: "hello" }],
      });
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain("✅");
    });

    it("fails json_contains when json path does not match value", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ a: { b: "hello" } }));
      const res = await handleVerifyAction(mockRoot, {
        description: "Checked config",
        checks: [{ type: "json_contains", path: "config.json", json_path: "a.b", value: "world" }],
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("❌");
    });
  });
});
