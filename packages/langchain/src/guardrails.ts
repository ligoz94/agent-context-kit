/**
 * @agent-context-kit/langchain — guardrails middleware
 *
 * Infrastructure-level enforcement: wraps any set of DynamicStructuredTools
 * and intercepts calls that match the `require_approval` guardrail list
 * before the tool function executes.
 *
 * This is the key difference from just having the `request_human_approval`
 * tool: the middleware enforces approval even if the model "forgets" to ask.
 */

import { DynamicStructuredTool } from "@langchain/core/tools";

export type ApprovalHandler = (
  toolName: string,
  input: unknown,
) => Promise<boolean>;

export interface GuardrailsMiddlewareOptions {
  /**
   * List of tool name patterns (exact match or prefix) that must be approved
   * before execution. Example: ["request_human_approval", "update_feature_status"]
   */
  requireApprovalForTools?: string[];

  /**
   * Called when a tool invocation requires human approval.
   * Return `true` to allow execution, `false` to block it.
   *
   * In CLI scripts this can read from stdin; in web apps it can open a modal.
   */
  onApprovalRequired: ApprovalHandler;

  /**
   * Optional: called when a tool is blocked (onApprovalRequired returned false).
   * Useful for logging or sending telemetry.
   */
  onBlocked?: (toolName: string, input: unknown) => void;
}

/**
 * Wraps an array of LangChain DynamicStructuredTools with guardrails enforcement.
 *
 * @example
 * ```typescript
 * const tools = createContextKitTools("./manifest.yaml");
 * const guardedTools = createGuardrailsMiddleware(tools, {
 *   requireApprovalForTools: ["update_feature_status", "add_learning"],
 *   onApprovalRequired: async (toolName, input) => {
 *     console.log(`\n⚠️  Agent wants to call: ${toolName}`);
 *     console.log("Input:", JSON.stringify(input, null, 2));
 *     const answer = await prompt("Approve? (yes/no): ");
 *     return answer.toLowerCase() === "yes";
 *   },
 * });
 * ```
 */
export function createGuardrailsMiddleware(
  tools: DynamicStructuredTool[],
  options: GuardrailsMiddlewareOptions,
): DynamicStructuredTool[] {
  const { requireApprovalForTools = [], onApprovalRequired, onBlocked } = options;

  return tools.map((tool) => {
    const needsApproval = requireApprovalForTools.some(
      (pattern) =>
        tool.name === pattern || tool.name.startsWith(pattern),
    );

    if (!needsApproval) return tool;

    // Wrap the original func with an approval gate
    const wrappedFunc = async (input: unknown) => {
      const approved = await onApprovalRequired(tool.name, input);

      if (!approved) {
        onBlocked?.(tool.name, input);
        return (
          `[guardrails] Execution of "${tool.name}" was DENIED by the human operator. ` +
          `Do not retry this action. Ask the user what they would like to do instead.`
        );
      }

      // TypeScript: tool.func accepts the input — cast as any for compatibility
      return (tool as any).func(input);
    };

    return new DynamicStructuredTool({
      name: tool.name,
      description: `[approval-required] ${tool.description}`,
      schema: (tool as any).schema,
      func: wrappedFunc as any,
    });
  });
}
