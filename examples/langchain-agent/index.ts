import "dotenv/config";
import {
  createContextKitTools,
  ContextKitCallbackHandler,
  enableLangSmith,
} from "@agent-context-kit/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import path from "path";
import { fileURLToPath } from "url";

// 1. Enable LangSmith observability (requires LANGCHAIN_API_KEY in .env)
// This automatically traces all LLM interactions and tool usages.
enableLangSmith({ projectName: "agent-context-kit-demo" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🚀 Starting LangChain Agent with Context-Kit tools...\n");

  // 2. Load the project manifest to generate the 8 context tools
  // We use the basic-web-app manifest for this demo
  const manifestPath = path.resolve(__dirname, "../basic-web-app/manifest.yaml");
  const tools = createContextKitTools(manifestPath);

  // 3. Setup the visual callback handler to see exactly what the LLM is doing
  const handler = new ContextKitCallbackHandler();

  // 4. Initialize the LLM (requires OPENAI_API_KEY in .env)
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
    callbacks: [handler], // 👈 Attach handler to observe LLM stream
  });

  // 5. Create the Agent
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are an expert software engineer assistant. " +
        "You always verify project context using your tools before answering questions about the codebase.",
    ],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = createToolCallingAgent({ llm, tools, prompt });
  const executor = new AgentExecutor({
    agent,
    tools,
    callbacks: [handler], // 👈 Attach handler to observe tool executions
  });

  // 6. Run a query! The LLM should automatically choose to call `get_project_identity`
  // and `get_rules` to find the answers.
  const query = "What are the core styling rules for this project and the preferred CSS approach?";
  console.log(`\x1b[1mQuery:\x1b[0m ${query}`);

  const result = await executor.invoke({
    input: query,
  });

  console.log(`\n\x1b[1mFinal Answer:\x1b[0m\n${result.output}\n`);
  console.log("✨ Check your LangSmith dashboard to see the full interaction trace.");
}

main().catch(console.error);
