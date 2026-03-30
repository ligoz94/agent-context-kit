# @agent-context-kit/langchain

LangChain **DynamicStructuredTool** adapters for **agent-context-kit**: the same tools as **`@agent-context-kit/toolshed-server`**, for Node agents.

## Install

```bash
npm install @agent-context-kit/langchain
```

Peer usage: Node **18+**, LangChain core compatible with your app.

## Usage

```typescript
import { createContextKitTools } from "@agent-context-kit/langchain";

const tools = createContextKitTools("./manifest.yaml");

// Optional: merge manifest.profiles.<name>
const backendTools = createContextKitTools("./manifest.yaml", { profile: "backend" });
```

Pass `tools` to `bindTools()`, an agent executor, or any LangChain workflow that accepts tools.

### Tools

Tool names match the MCP server (subject to `toolshed.tool_aliases` in `manifest.yaml`). They include **`get_project_identity`**, **`get_guardrails`**, **`get_rules`**, **`get_learnings`**, **`get_spec`**, **`list_registry`**, **`lookup_glossary`**, **`add_learning`**, **`add_glossary_term`**, **`update_feature_status`**, **`get_prompt`**, **`list_prompts`**, **`search_context`**, **`validate_context`**, **`request_human_approval`**, and **`verify_action`**.

### LangSmith (optional)

```typescript
import { enableLangSmith } from "@agent-context-kit/langchain";

enableLangSmith({ projectName: "my-agent" });
```

## See also

- **`@agent-context-kit/toolshed-server`** — stdio MCP server for editors
- **`@agent-context-kit/cli`** — `context-kit init`, `check`, `sync`, `new-spec`
- Monorepo root **README** (this repository) for full workflow and manifest reference

## License

MIT
