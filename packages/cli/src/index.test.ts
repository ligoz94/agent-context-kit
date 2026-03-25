import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  findTemplateDir,
  cmdCheck,
  syncEngineRegions,
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
});
