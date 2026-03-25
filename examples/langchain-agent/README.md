# LangChain Agent Example

This directory demonstrates how to use `@agent-context-kit/langchain` within a real AI agent built with LangChain.js.

The agent uses:
- `createContextKitTools` to convert the `basic-web-app` manifest into LangChain `DynamicStructuredTool`s.
- `ContextKitCallbackHandler` to pretty-print tool calls and inputs to the terminal.
- `enableLangSmith` to automatically export deep LLM traces to LangSmith.

## How to run

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Create a `.env` file from the sample:
   \`\`\`bash
   cp .env.sample .env
   \`\`\`

3. Fill out your `.env`:
   - `OPENAI_API_KEY` (Required for the LLM)
   - `LANGCHAIN_API_KEY` (Required if you want to see LangSmith traces)

4. Run the agent:
   \`\`\`bash
   npm start
   \`\`\`

You will see the terminal output as the LLM decides to lookup the project values, rules, and finally synthesizes an answer based solely on the provided context tools.
