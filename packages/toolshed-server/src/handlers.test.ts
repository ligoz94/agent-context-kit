import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleGetProjectIdentity,
  handleGetRules,
  handleGetSpec,
  handleListRegistry,
  handleGetPrompt,
  Manifest
} from "./handlers.js";
import fs from "fs";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  const mocks = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
  return {
    ...actual,
    ...mocks,
    default: {
      ...actual,
      ...mocks,
    },
  };
});

const mockRoot = "/tmp/mock-root";

describe("@agent-context-kit/toolshed-server/handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

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
          standards: [{ name: "testing", path: "test.md" }] 
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
            { name: "style", path: "style.md" }
          ] 
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
        registry: [
          { name: "feature_a", path: "a.md", status: "beta" }
        ],
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
});
