import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";

/**
 * Creates a standard evaluation dataset in LangSmith for context-kit tests.
 */
export async function createContextKitDataset(client: Client) {
  const datasetName = "context-kit-evals";
  if (await client.hasDataset({ datasetName })) {
    return (await client.readDataset({ datasetName })).id;
  }

  const dataset = await client.createDataset(datasetName, {
    description: "Standard queries for agent-context-kit tool evaluation",
  });

  await client.createExamples({
    inputs: [
      { input: "What are this project's core values?" },
      { input: "What coding standards should I follow?" },
      { input: "What are the biggest past mistakes to avoid?" },
      { input: "What is the architecture stack used in this project?" },
    ],
    datasetId: dataset.id,
  });

  return dataset.id;
}

/**
 * Runs the standard evaluation dataset against your agent function.
 * Evaluators must be provided (e.g., answerRelevancyEvaluator).
 */
export async function runContextEvals(
  agentFn: (input: Record<string, any>) => Promise<any>,
  evaluators: any[] // From langsmith/evaluation
): Promise<any> {
  return evaluate(agentFn, {
    data: "context-kit-evals",
    evaluators,
    metadata: { source: "agent-context-kit" },
  });
}
