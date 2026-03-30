# LangChain agent example

This directory shows how to use **`@agent-context-kit/langchain`** in a small LangChain.js agent.

The agent uses:

- **`createContextKitTools`** — builds LangChain `DynamicStructuredTool`s from the **`examples/basic-web-app`** `manifest.yaml` (same tool surface as the Toolshed MCP server: identity, rules, guardrails, registry, search, validate, write helpers, `request_human_approval`, `verify_action`, …).
- **`ContextKitCallbackHandler`** — logs tool calls and inputs to the terminal.
- **`enableLangSmith`** — optional tracing to LangSmith.

At startup the system prompt tells the model to call **`get_project_identity`** and **`get_guardrails`** first, then pull other context as needed.

## How to run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from the sample:

   ```bash
   cp .env.sample .env
   ```

3. Fill out `.env`:

   - `OPENAI_API_KEY` — required for the LLM
   - `LANGCHAIN_API_KEY` — optional, for LangSmith traces

4. Run the agent:

   ```bash
   npm start
   ```

You should see the model use the context tools (values, rules, learnings, etc.) before answering.

## Optional: OpenRouter variant

`openrouter.ts` uses the same tools with a different model provider; adjust env vars as documented in that file.
