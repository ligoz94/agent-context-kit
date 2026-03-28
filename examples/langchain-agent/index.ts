import "dotenv/config";
import * as readline from "readline";
import {
  createContextKitTools,
  createGuardrailsMiddleware,
  ContextKitCallbackHandler,
  enableLangSmith,
} from "@agent-context-kit/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import path from "path";
import { fileURLToPath } from "url";

// 1. Enable LangSmith observability (requires LANGCHAIN_API_KEY in .env)
enableLangSmith({ projectName: "agent-context-kit-demo" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Helper: CLI approval prompt ───────────────────────────────────────────────
// In a real app this could be a web modal, Slack message, etc.
async function askHumanApproval(toolName: string, input: unknown): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (prompt: string) =>
    new Promise<string>((resolve) => rl.question(prompt, resolve));

  console.log(`\n${"─".repeat(60)}`);
  console.log(`🛑 GUARDRAIL TRIGGERED — Agent wants to call: \x1b[33m${toolName}\x1b[0m`);
  console.log(`Input:\n${JSON.stringify(input, null, 2)}`);
  console.log("─".repeat(60));

  const answer = await question("Approve? (yes/no): ");
  rl.close();

  return answer.trim().toLowerCase() === "yes";
}

async function main() {
  console.log("🚀 Starting LangChain Agent with Context-Kit tools + Guardrails...\n");

  // 2. Load context tools from the manifest
  const manifestPath = path.resolve(__dirname, "../basic-web-app/manifest.yaml");
  const rawTools = createContextKitTools(manifestPath);

  // 3. Wrap tools with guardrails middleware
  //    The middleware intercepts calls to high-risk tools and forces human approval,
  //    even if the LLM "forgets" to call request_human_approval itself.
  const tools = createGuardrailsMiddleware(rawTools, {
    requireApprovalForTools: [
      "update_feature_status",  // writing back to manifest — risky
      "add_learning",           // modifying the project knowledge base
      "add_glossary_term",      // modifying the project knowledge base
    ],
    onApprovalRequired: askHumanApproval,
    onBlocked: (toolName, input) => {
      console.log(`\n🚫 Execution of "${toolName}" was blocked by the operator.`);
    },
  });

  // 4. Setup observability callback
  const handler = new ContextKitCallbackHandler();

  // 5. Initialize the LLM
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
    callbacks: [handler],
  });

  // 6. Create the Agent — system prompt includes guardrails instruction
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are an expert software engineer assistant. " +
        "At the start of every session, call `get_project_identity` and `get_guardrails` to orient yourself. " +
        "Always respect the guardrails: never perform blocked actions, and always call " +
        "`request_human_approval` before any action listed under require_approval. " +
        "After making any change to a file, call `verify_action` to confirm the change was applied.",
    ],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  const agent = createToolCallingAgent({ llm, tools, prompt });
  const executor = new AgentExecutor({ agent, tools, callbacks: [handler] });

  // 7. Run a query that exercises the guardrails flow
  const query =
    "Update the status of the 'user-auth' feature to 'done', then verify the change was applied.";
  console.log(`\x1b[1mQuery:\x1b[0m ${query}\n`);

  const result = await executor.invoke({ input: query });

  console.log(`\n\x1b[1mFinal Answer:\x1b[0m\n${result.output}\n`);
  console.log("✨ Check your LangSmith dashboard for the full interaction trace.");
}

main().catch(console.error);
