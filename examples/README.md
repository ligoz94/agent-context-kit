# Example Projects

This directory contains concrete examples of how to adopt `agent-context-kit` in real codebases.

## `basic-web-app`
A simulated Next.js web application. This example demonstrates:
- A fully filled-out `manifest.yaml` with real identity, rules, and features.
- A comprehensive `docs/agent/values.md` file replacing the boilerplate template.
- A functional setup you can load into toolshed immediately.

**To try it out:**
\`\`\`bash
# From the root of the monorepo
npx @agent-context-kit/toolshed-server --manifest examples/basic-web-app/manifest.yaml
\`\`\`

*(Note: In a real project, \`manifest.yaml\` and \`docs/agent\` would live at the root of your repository).*
