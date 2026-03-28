#!/usr/bin/env node

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templateRoot = path.resolve(__dirname, "..");
const featuresRoot = path.join(templateRoot, "docs", "features");

function usage() {
  console.log(
    "Usage: node scripts/new-feature.mjs <feature-name> [first-decision-slug]",
  );
  console.log("Example: node scripts/new-feature.mjs dark-mode theme-toggle");
}

function toKebabCase(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleCaseFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const rawFeatureName = process.argv[2];
  const rawDecisionName = process.argv[3] ?? "initial-decision";

  if (!rawFeatureName || rawFeatureName === "-h" || rawFeatureName === "--help") {
    usage();
    process.exit(rawFeatureName ? 0 : 1);
  }

  const featureSlug = toKebabCase(rawFeatureName);
  const decisionSlug = toKebabCase(rawDecisionName);

  if (!featureSlug) {
    console.error("Invalid feature name. Use letters, numbers, and separators.");
    process.exit(1);
  }
  if (!decisionSlug) {
    console.error("Invalid decision slug. Use letters, numbers, and separators.");
    process.exit(1);
  }

  const featureDir = path.join(featuresRoot, featureSlug);
  const specsDir = path.join(featureDir, "specs");
  const featureFile = path.join(featureDir, "feature.md");
  const specFile = path.join(specsDir, `001-${decisionSlug}.md`);

  if (await exists(featureDir)) {
    console.error(`Feature folder already exists: docs/features/${featureSlug}`);
    process.exit(1);
  }

  const featureTemplatePath = path.join(featuresRoot, "_template.md");
  const specTemplatePath = path.join(featuresRoot, "specs", "_template.md");

  const [featureTemplate, specTemplate] = await Promise.all([
    readFile(featureTemplatePath, "utf8"),
    readFile(specTemplatePath, "utf8"),
  ]);

  const featureContent = featureTemplate
    .replaceAll("<feature-name>", toTitleCaseFromSlug(featureSlug))
    .replaceAll("<decision>", decisionSlug);

  const specContent = specTemplate.replaceAll(
    "<decision-title>",
    toTitleCaseFromSlug(decisionSlug),
  );

  await mkdir(specsDir, { recursive: true });
  await writeFile(featureFile, featureContent, "utf8");
  await writeFile(specFile, specContent, "utf8");

  console.log("Feature scaffold created:");
  console.log(`- docs/features/${featureSlug}/feature.md`);
  console.log(`- docs/features/${featureSlug}/specs/001-${decisionSlug}.md`);
  console.log("");
  console.log("Next steps:");
  console.log("- Complete placeholders in both files.");
  console.log("- Register the feature in manifest.yaml.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
