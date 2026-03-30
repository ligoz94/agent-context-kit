import { describe, it, expect, vi, beforeEach } from "vitest";
import { createContextKitTools } from "./tools.js";
import { ContextKitCallbackHandler } from "./callback-handler.js";
import { enableLangSmith } from "./langsmith.js";

vi.mock("fs", () => {
  return {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe("@agent-context-kit/langchain", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.LANGCHAIN_TRACING_V2;
    delete process.env.LANGCHAIN_PROJECT;
    delete process.env.LANGCHAIN_TAGS;
  });

  describe("createContextKitTools", () => {
    it("throws if manifest not found", async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(() => createContextKitTools("manifest.yaml")).toThrow(/not found/);
    });

    it("throws if manifest is invalid", async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("bad_yaml: [}");
      expect(() => createContextKitTools("manifest.yaml")).toThrow(/Invalid manifest.yaml structure/);
    });

    it("returns the full Toolshed tool set with valid manifest", async () => {
      const fs = await import("fs");
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("identity:\n  values: values.md");
      const tools = createContextKitTools("manifest.yaml");
      expect(tools.length).toBe(16);
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual([
        "add_glossary_term",
        "add_learning",
        "get_guardrails",
        "get_learnings",
        "get_project_identity",
        "get_prompt",
        "get_rules",
        "get_spec",
        "list_prompts",
        "list_registry",
        "lookup_glossary",
        "request_human_approval",
        "search_context",
        "update_feature_status",
        "validate_context",
        "verify_action",
      ]);
    });
  });

  describe("langsmith config", () => {
    it("sets env vars correctly", () => {
      enableLangSmith({ projectName: "test-proj", tags: ["a", "b"] });
      expect(process.env.LANGCHAIN_TRACING_V2).toBe("true");
      expect(process.env.LANGCHAIN_PROJECT).toBe("test-proj");
      expect(process.env.LANGCHAIN_TAGS).toBe("a,b");
    });
  });

  describe("ContextKitCallbackHandler", () => {
    it("instantiates correctly", () => {
      const handler = new ContextKitCallbackHandler();
      expect(handler.name).toBe("ContextKitCallbackHandler");
    });
  });
});
