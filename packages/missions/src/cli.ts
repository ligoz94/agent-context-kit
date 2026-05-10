#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { createMissionState, readMissionState } from "./state.js";

function readConfig(cwd: string): { stateDir?: string } {
  const manifestPath = join(cwd, "manifest.yaml");
  if (!existsSync(manifestPath)) return {};
  const raw = readFileSync(manifestPath, "utf8");
  const match = raw.match(/state_dir:\s*([^\n]+)/);
  return { stateDir: match?.[1]?.trim() };
}

const [, , command, ...rest] = process.argv;
const cwd = process.cwd();
const config = readConfig(cwd);

if (command === "start") {
  const goal = rest.join(" ");
  if (!goal) {
    console.error("Goal is required. Usage: context-kit-mission start <goal>");
    process.exit(1);
  }
  const state = createMissionState(cwd, goal, config);
  console.log(`Created mission: ${state.id}`);
  process.exit(0);
}

if (command === "status") {
  const state = readMissionState(cwd, config, rest[0]);
  if (!state) {
    console.error("No mission state found.");
    process.exit(1);
  }
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

console.log("context-kit-mission <start|status>");
