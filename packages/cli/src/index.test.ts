import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findTemplateDir,
  cmdCheck,
  syncEngineRegions,
  detectProjectInfo,
  replaceProjectRegion,
} from "./index.js";
import fs from "fs";
import path from "path";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  const mocks = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
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

describe("@agent-context-kit/cli", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("findTemplateDir", () => {
    it("throws if template dir not found", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(() => findTemplateDir()).toThrow(/Template not found/);
    });

    it("returns path if manifest exists", () => {
      // First candidate fails, second candidate succeeds
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return String(p).includes("manifest.yaml");
      });
      const res = findTemplateDir();
      expect(res).toContain("template");
    });
  });

  describe("cmdCheck", () => {
    it("returns 1 if manifest missing", () => {
      const mockCwd = "/tmp/mock-cwd";
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (String(p).includes("manifest.yaml")) return false;
        return true;
      });
      const code = cmdCheck(mockCwd);
      expect(code).toBe(1);
    });

    it("returns 0 if all required files exist", () => {
      const mockCwd = "/tmp/mock-cwd";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("short content");
      const code = cmdCheck(mockCwd);
      expect(code).toBe(0);
    });

    it("returns 1 if a required file is missing", () => {
      const mockCwd = "/tmp/mock-cwd";
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (String(p).includes("manifest.yaml")) return true;
        if (String(p).includes("values.md")) return false;
        return true;
      });
      const code = cmdCheck(mockCwd);
      expect(code).toBe(1);
    });

    it("warns when CLAUDE.md exceeds token and line budgets", () => {
      const mockCwd = "/tmp/mock-cwd";
      const longLines = Array.from({ length: 210 }, () => "x").join("\n");
      const longBody = `${longLines}\n${"z".repeat(2400)}`;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).endsWith("CLAUDE.md")) return longBody;
        return "short";
      });
      const code = cmdCheck(mockCwd);
      expect(code).toBe(0);
    });
  });

  describe("syncEngineRegions", () => {
    it("returns false if file doesn't exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(syncEngineRegions("/foo", "content")).toBe(false);
    });

    it("returns false if no template regions exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("existing");
      expect(syncEngineRegions("/foo", "no regions here")).toBe(false);
    });

    it("updates region and returns true", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
`some text
<!-- agent-context-kit:engine:start -->
OLD STUFF
<!-- agent-context-kit:engine:end -->
other text`
      );

      const template = 
`<!-- agent-context-kit:engine:start -->
NEW STUFF
<!-- agent-context-kit:engine:end -->`;

      const result = syncEngineRegions("/foo", template);
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/foo",
        `some text\n<!-- agent-context-kit:engine:start -->\nNEW STUFF\n<!-- agent-context-kit:engine:end -->\nother text`
      );
    });
  });

  describe("detectProjectInfo", () => {
    it("detects typescript and react stack from package.json", () => {
      vi.mocked(fs.existsSync).mockImplementation((p) =>
        String(p).endsWith("package.json"),
      );
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: "my-app",
          dependencies: { react: "^18", typescript: "^5" },
        }),
      );
      const info = detectProjectInfo("/tmp/proj");
      expect(info.name).toBe("my-app");
      expect(info.language).toBe("typescript");
      expect(info.stack).toContain("react");
    });

    it("detects go from go.mod", () => {
      vi.mocked(fs.existsSync).mockImplementation((p) =>
        String(p).endsWith("go.mod"),
      );
      vi.mocked(fs.readFileSync).mockReturnValue("module github.com/org/myservice\n");
      const info = detectProjectInfo("/tmp/proj");
      expect(info.language).toBe("go");
      expect(info.name).toBe("myservice");
    });

    it("falls back to directory name when no project files found", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const info = detectProjectInfo("/tmp/my-cool-project");
      expect(info.name).toBe("my-cool-project");
    });
  });

  describe("replaceProjectRegion", () => {
    it("replaces project region content", () => {
      const content = `header\n<!-- agent-context-kit:project:start -->\nOLD\n<!-- agent-context-kit:project:end -->\nfooter`;
      const result = replaceProjectRegion(content, "NEW CONTENT");
      expect(result).toContain("NEW CONTENT");
      expect(result).not.toContain("OLD");
      expect(result).toContain("header");
      expect(result).toContain("footer");
    });

    it("returns content unchanged if no project region exists", () => {
      const content = "no regions here";
      expect(replaceProjectRegion(content, "NEW")).toBe("no regions here");
    });
  });
});

