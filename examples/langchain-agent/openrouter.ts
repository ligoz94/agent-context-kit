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

// 1. Enable LangSmith observability 
enableLangSmith({ projectName: "agent-context-kit-openrouter" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🚀 Starting LangChain Agent with OpenRouter...\n");

  const manifestPath = path.resolve(__dirname, "../basic-web-app/manifest.yaml");
  const tools = createContextKitTools(manifestPath);
  const handler = new ContextKitCallbackHandler();

  // 2. Initialize the LLM specifically for OpenRouter
  // Make sure you have OPENROUTER_API_KEY in your .env file
  const llm = new ChatOpenAI({
    modelName: "openai/gpt-oss-20b:free", // This model natively supports Tools!
    temperature: 0,
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    maxRetries: 2, // <--- Prevents infinite delays caused by rate limit retries
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://github.com/agent-context-kit", // Optional but recommended by OpenRouter
        "X-Title": "Agent Context Kit", // Optional
      },
    },
    callbacks: [handler],
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are an expert software engineer assistant. " +
        "You always verify project context using your tools before answering.",
    ],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = createToolCallingAgent({ llm, tools, prompt });
  const executor = new AgentExecutor({
    agent,
    tools,
    verbose: true,      // <--- Added to diagnose infinite loops or parsing errors
    maxIterations: 1,   // <--- Stops the agent after 5 iterations to avoid infinite pending
    callbacks: [handler],
  });

  const query = "I need to implement a new feature in this project. Please check the registry of specifications and write the perfect code respecting our architectural rules.";
  console.log(`\x1b[1mQuery:\x1b[0m ${query}`);

  const result = await executor.invoke({ input: query });

  console.log(`\n\x1b[1mFinal Answer:\x1b[0m\n${result.output}\n`);
}

main().catch(console.error);
