#!/usr/bin/env bash
set -euo pipefail

echo "=== Build all packages ==="
npm run build --workspaces --if-present

echo "=== Stage template for CLI ==="
node packages/cli/scripts/stage-template.mjs

echo "=== Publish all modified packages ==="
npm publish -w @agent-context-kit/cli
npm publish -w @agent-context-kit/toolshed-server
npm publish -w @agent-context-kit/langchain

echo "=== Done ==="
echo ""
echo "On target project, run:"
echo "  npm install @agent-context-kit/cli@latest @agent-context-kit/toolshed-server@latest"
echo "  npx @agent-context-kit/cli sync"
