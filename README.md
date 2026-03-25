# agent-context-kit

A framework for perfect LLM context on any project.

Inspired by Stripe's Developer Toolshed pattern. Language-agnostic, editor-agnostic, LLM-agnostic.

---

## 🛑 The Problem

Every AI/LLM agent starts blind when it enters your codebase. You either dump too much context (wasting tokens, causing noisy or "hallucinated" output) or too little (resulting in generic, incorrectly architected code). There is no standard way to tell an agent *what this project is, how it works, and what not to do*.

## 💡 The Solution

`agent-context-kit` uses a **4-layer context structure** combined with dynamic tools to expose your project's knowledge graph to AI agents exactly when they need it. Agents fetch what they need dynamically instead of reading the whole repository.

```
L0 Identity   → who the project is       (always loaded, compact)
L1 Rules      → how the project works    (loaded per task)
L2 Knowledge  → what the project knows   (fetched on demand)
L3 Context    → what the task is         (your chat input)
```

### ✨ Key Advantages
- **Single Source of Truth:** Stop copying and pasting prompts. Define your rules in `manifest.yaml` and standard Markdown files.
- **Strict Validation:** Built-in Zod schema validation ensures your configuration files are perfectly formatted before agents read them.
- **Universal Compatibility:** Expose your context via **MCP (Model Context Protocol)** to IDEs like Cursor and Claude Desktop, OR natively via **LangChain** directly in your Node.js agents.
- **Token Efficiency:** The toolkit actively prevents you from blowing out LLM context windows by enforcing token budgets on your architectural documents.

---

## 🚀 How to Use It (Quickstart)

### 1. Scaffold your project
Run the CLI in the root of your repository to generate the base structure:
\`\`\`bash
npx @agent-context-kit/cli init
\`\`\`

### 2. Define your knowledge
This creates a `manifest.yaml` and a `docs/agent/` folder. Fill in the Markdown files:
- `values.md` → Your non-negotiables (e.g., "Always use Tailwind", "Never fetch on the client").
- `glossary.md` → Your project terms.
- `architecture-primer.md` → Your codebase map.

### 3. Consume the context

You can feed this context to AI agents in two ways:

#### Option A: IDEs / MCP Clients (Cursor, Claude Desktop)
Start the Toolshed server out of the box. It implements the standard Model Context Protocol:
\`\`\`bash
npx @agent-context-kit/toolshed-server
\`\`\`
*See `docs/human/toolshed-mcp-setup.md` inside your repo after initialization for full IDE setup instructions.*

#### Option B: LangChain.js Agents
If you are building your own custom agents in Node/TypeScript, you can import your project context directly as LangChain tools and track them via LangSmith.
\`\`\`bash
npm install @agent-context-kit/langchain
\`\`\`
\`\`\`typescript
import { createContextKitTools, enableLangSmith } from "@agent-context-kit/langchain";

// Enable tracing to see exactly what context the LLM is reading
enableLangSmith({ projectName: "my-agent-demo" });

// Generate 8 DynamicStructuredTools that read from your project
const tools = createContextKitTools("./manifest.yaml");

// Pass the tools to any LangChain agent executor!
\`\`\`

---

## 📖 Example Workflow (In Practice)

Here is a step-by-step example of how `agent-context-kit` fundamentally changes how you code with AI:

1. **The Goal:** You need to build a new "User Settings" page in your web app.
2. **The Prompt:** You open Cursor (or Claude) and ask: *"Build the User Settings page."*
3. **What the LLM does (Behind the Scenes):**
   - **Step A (Orientation):** Before writing any code, the LLM calls the `get_project_identity` tool. It reads your `values.md` and discovers: *"Ah, this team strictly uses Tailwind CSS and React Server Components. No client-side fetching allowed."*
   - **Step B (Specific Rules):** The LLM then calls `get_rules({ standard: "react" })` to read your team's specific component structure guidelines.
   - **Step C (Past Mistakes):** The LLM calls `get_learnings` and reads: *"Do not use the native HTML select dropdown, it's bugged on our layout. Always use the shadcn/ui Select."*
4. **The Result:** The LLM generates the exact, perfect code for the Settings page on its very first try, perfectly matching your company's architecture without you having to write a 3-page prompt.

---

## 🛠️ The Toolshed Tools

Whether using MCP or LangChain, your agent automatically gains access to these 8 tools:

| Tool | What it returns |
|------|----------------|
| `get_project_identity` | L0: values + architecture + glossary |
| `get_rules` | L1: context policy + standards |
| `get_learnings` | L2: key learnings |
| `get_spec` | L2: spec for a named feature |
| `list_registry` | All features with status |
| `lookup_glossary` | Definition of a specific term |
| `get_prompt` | A named prompt template |
| `list_prompts` | All available prompts |

---

## 📦 Packages Overview

This monorepo is fully typed, tested (Vitest), and CI-ready. It consists of three packages:

| Package | Purpose |
|---------|---------|
| `@agent-context-kit/cli` | `context-kit` CLI commands (`init`, `sync`, `check`) |
| `@agent-context-kit/toolshed-server` | Standalone MCP server executable |
| `@agent-context-kit/langchain` | LangChain adapters, Callbacks, and LangSmith Evaluators |

### Concrete Examples
Look inside the `/examples` directory of this repository to see fully fleshed out, realistic setups:
- `/examples/basic-web-app`: Shows what a realistic `manifest.yaml` and documentation suite looks like for a Next.js App Router project.
- `/examples/langchain-agent`: A running OpenAI conversational agent script demonstrating the LangChain observability integration.

---

## ⚙️ CLI Reference

Ensure your context repository stays healthy with the toolkit's CLI:

### \`context-kit init\`
Scaffolds the `manifest.yaml` and `docs/agent/` structure into your current directory. It safely skips files that already exist.

### \`context-kit check\`
Your project's safety net. It runs a full validation pass before the MCP server boots:
- **Manifest Validation:** Ensures your `manifest.yaml` conforms to the Zod schema.
- **Link Auditing:** Verifies that every file referenced in the manifest actually exists on disk.
- **Token Budgets:** Analyzes your markdown files and warns you if they exceed the recommended token limits (see Token Budgets below), preventing you from overflowing the LLM.

### \`context-kit sync\`
Updates the underlying kit instructions in your documentation files without touching your custom project data.  

Since you write your project knowledge inside the same Markdown files that the LLM uses for its meta-prompt instructions, the files contain two kinds of regions:

- **Engine Regions (`<!-- agent-context-kit:engine:start -->`)**: These blocks contain instructions generated by the toolkit itself (e.g., telling the LLM to prioritize certain rules or how many tokens it has left to read). When you run `sync`, the CLI fetches the latest upstream improvements for these blocks and replaces them.
- **Project Regions (`<!-- agent-context-kit:project:start -->`)**: This is where you write *your* actual content (your architecture, your values, your feature specs). The `sync` command will **never** overwrite or touch anything inside these blocks.

Example of a tracked Markdown file:
\`\`\`markdown
<!-- agent-context-kit:engine:start -->
# L0: Identity & Values
> **Goal:** Align AI output with team non-negotiables. Define *how* we build things here.
> **Target:** < 400 tokens. Broad impact across all interactions.
<!-- agent-context-kit:engine:end -->

<!-- agent-context-kit:project:start -->
Your custom project values go here. This text is perfectly preserved during a sync!
<!-- agent-context-kit:project:end -->
\`\`\`

### \`context-kit list\`
A quick utility to list all currently active features and prompts registered in your manifest.

## Token Budget Guidelines

\`context-kit check\` will warn you if your context limits exceed:

| Layer | Target | Hard limit |
|-------|--------|-----------|
| L0 (identity) | < 800 tokens | 1500 |
| L1 (rules) | < 600 tokens | 1200 |
| L2 per spec | < 400 tokens | 800 |
| L3 (task) | your call | — |

---

## License

MIT
