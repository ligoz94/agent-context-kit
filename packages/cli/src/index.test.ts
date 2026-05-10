import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../missions/dist/index.js", () => ({
  createValidatorResult: vi.fn((input) => ({
    runId: input.runId,
    validator: input.validator,
    status: (input.failedChecks?.length ?? 0) > 0 ? "failed" : "passed",
    summary: input.summary,
    findings: (input.failedChecks ?? []).map((check: string, index: number) => ({
      id: `${input.runId}-finding-${index + 1}`,
      validator: input.validator,
      severity: input.validator === "behavioral" ? "high" : "medium",
      summary: check,
      details: input.summary,
      relatedSliceId: input.relatedSliceId,
    })),
  })),
  runMissionLoop: vi.fn(),
}));

import {
  buildInitManifest,
  enableMissionManifest,
  cmdEnableMission,
  findTemplateDir,
  cmdCheck,
  cmdMissionRun,
  cmdMissionStart,
  cmdMissionStatus,
  cmdMissionValidate,
  syncEngineRegions,
  detectProjectInfo,
  replaceProjectRegion,
} from "./index.js";
import fs from "fs";
import path from "path";
import { runMissionLoop } from "../../missions/dist/index.js";
import { execSync } from "child_process";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  const mocks = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    realpathSync: vi.fn((p) => p),
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

  describe("buildInitManifest", () => {
    it("removes mission workflow scaffolding from the default init manifest", () => {
      const manifest = `registry:\n  - name: feature-a\n    path: docs/features/a.md\n    status: stable\n  - name: mission-runtime\n    path: docs/features/mission-runtime/feature.md\n    status: planned\n\n# ── Mission Runtime (optional) ───────────────────────────────────────────────\n# mission:\n#   enabled: true\n`;
      const output = buildInitManifest(manifest, false);
      expect(output).not.toContain("mission-runtime");
      expect(output).not.toContain("Mission Runtime (optional)");
      expect(output).toContain("feature-a");
    });

    it("keeps mission workflow scaffolding when explicitly enabled", () => {
      const manifest = `registry:\n  - name: mission-runtime\n    path: docs/features/mission-runtime/feature.md\n    status: planned\n\n# ── Mission Runtime (optional) ───────────────────────────────────────────────\n# mission:\n#   enabled: true\n`;
      const output = buildInitManifest(manifest, true);
      expect(output).toContain("mission-runtime");
      expect(output).toContain("Mission Runtime (optional)");
    });
  });

  describe("enableMissionManifest", () => {
    it("adds mission workflow registry entry and config block", () => {
      const manifest = `registry:\n  - name: feature-a\n    path: docs/features/a.md\n    status: stable\n`;
      const output = enableMissionManifest(manifest);
      expect(output).toContain("name: mission-runtime");
      expect(output).toContain("mission:\n  enabled: true");
    });

    it("does not duplicate mission config if already enabled", () => {
      const manifest = `registry:\n  - name: mission-runtime\n    path: docs/features/mission-runtime/feature.md\n    status: planned\n\nmission:\n  enabled: true\n  state_dir: .agent-context-kit/missions\n`;
      const output = enableMissionManifest(manifest);
      expect(output.match(/name: mission-runtime/g)?.length).toBe(1);
      expect(output.match(/\nmission:\n/g)?.length).toBe(1);
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
other text`,
      );

      const template = `<!-- agent-context-kit:engine:start -->
NEW STUFF
<!-- agent-context-kit:engine:end -->`;

      const result = syncEngineRegions("/foo", template);
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/foo",
        `some text\n<!-- agent-context-kit:engine:start -->\nNEW STUFF\n<!-- agent-context-kit:engine:end -->\nother text`,
      );
    });
  });

  describe("detectProjectInfo", () => {
    it("detects typescript and react stack from package.json", () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith("package.json"));
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
      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith("go.mod"));
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

  describe("mission commands", () => {
    it("creates a mission state file", () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).includes("manifest.yaml"));
      vi.mocked(fs.readFileSync).mockReturnValue(
        "mission:\n  state_dir: .agent-context-kit/missions\n",
      );
      cmdMissionStart("Ship mission MVP", "/tmp/mock-cwd");
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("creates a mission from a GitHub issue", async () => {
      const { execSync } = await import("child_process");
      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).includes("manifest.yaml"));
      vi.mocked(fs.readFileSync).mockReturnValue(
        "mission:\n  state_dir: .agent-context-kit/missions\n",
      );
      vi.mocked(execSync).mockReturnValue(
        JSON.stringify({
          number: 42,
          title: "Implement planner",
          body: "- Add plan\n- Add validation",
          url: "https://example.test/issues/42",
        }),
      );
      cmdMissionStart(["--issue", "42", "--repo", "owner/repo"], "/tmp/mock-cwd");
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("prints mission status for latest mission", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["mission-1.json"] as any);
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 123 } as any);
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).endsWith("manifest.yaml"))
          return "mission:\n  state_dir: .agent-context-kit/missions\n";
        return JSON.stringify({
          id: "mission-1",
          goal: "Goal",
          status: "planned",
          sourceIssue: { number: 42 },
          plan: { summary: "Plan", slices: [] },
          handoffs: [],
          events: [{ message: "created" }],
          findings: [],
        });
      });
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      cmdMissionStatus(undefined, "/tmp/mock-cwd");
      expect(logSpy).toHaveBeenCalledWith("Mission: mission-1");
      logSpy.mockRestore();
    });

    it("records validator results and writes updated mission state", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["mission-1.json"] as any);
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 123 } as any);
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).endsWith("manifest.yaml"))
          return "mission:\n  state_dir: .agent-context-kit/missions\n";
        return JSON.stringify({
          id: "mission-1",
          goal: "Goal",
          status: "planned",
          plan: { summary: "Plan", slices: [] },
          handoffs: [],
          events: [],
          findings: [],
        });
      });
      cmdMissionValidate(
        ["--validator", "scrutiny", "--summary", "Tests failed", "--failed-check", "A test failed"],
        "/tmp/mock-cwd",
      );
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("runs the autonomous mission loop", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["mission-1.json"] as any);
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 123 } as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        "mission:\n  state_dir: .agent-context-kit/missions\n",
      );
      vi.mocked(runMissionLoop).mockResolvedValue({
        reason: "completed",
        iterations: 4,
        state: {
          id: "mission-1",
          status: "completed",
          plan: { slices: [{ id: "slice-1", status: "completed" }] },
          findings: [],
          events: [
            { type: "mission.created", message: "Mission created" },
            { type: "mission.slice_completed", message: "Completed implement slice slice-1" },
            { type: "mission.completed", message: "Mission completed for goal: Goal" },
          ],
        },
      } as any);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await cmdMissionRun(["--simulate-finding", "Fix flaky test"], "/tmp/mock-cwd");

      expect(runMissionLoop).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith("Loop reason: completed");
      expect(logSpy).toHaveBeenCalledWith("Timeline:");
      expect(logSpy).toHaveBeenCalledWith("- Mission completed for goal: Goal");
      logSpy.mockRestore();
    });

    it("passes worker and validator commands into the autonomous loop", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(["mission-1.json"] as any);
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 123 } as any);
      vi.mocked(fs.readFileSync).mockReturnValue(
        "mission:\n  state_dir: .agent-context-kit/missions\n  execution:\n    worker_commands:\n      - npm run build\n    validator_commands:\n      scrutiny:\n        - npm test\n",
      );
      vi.mocked(execSync).mockImplementation((command: string) => `ok:${command}` as any);
      vi.mocked(runMissionLoop).mockImplementation(async (_root, options: any) => {
        await options.worker({ slice: { kind: "implement", title: "Implement", id: "slice-1" } });
        options.validator({ slice: { id: "slice-2", dependsOn: ["slice-1"] } });
        return {
          reason: "completed",
          iterations: 2,
          state: {
            id: "mission-1",
            status: "completed",
            plan: { slices: [] },
            findings: [],
            events: [
              { type: "mission.slice_completed", message: "Completed implement slice slice-1" },
            ],
          },
        } as any;
      });

      await cmdMissionRun([], "/tmp/mock-cwd");

      expect(execSync).toHaveBeenCalledWith(
        "npm run build",
        expect.objectContaining({ cwd: "/tmp/mock-cwd", encoding: "utf8" }),
      );
      expect(execSync).toHaveBeenCalledWith(
        "npm test",
        expect.objectContaining({ cwd: "/tmp/mock-cwd", encoding: "utf8" }),
      );
    });
  });

  describe("cmdEnableMission", () => {
    it("enables mission workflow in an existing classic project", () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).includes("manifest.yaml"));
      vi.mocked(fs.readFileSync).mockImplementation((p: fs.PathOrFileDescriptor) => {
        if (String(p).endsWith("manifest.yaml")) {
          return "registry:\n  - name: feature-a\n    path: docs/features/a.md\n    status: stable\n";
        }
        return "content";
      });

      cmdEnableMission("/tmp/mock-cwd");

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
