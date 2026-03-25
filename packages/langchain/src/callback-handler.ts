import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Serialized } from "@langchain/core/load/serializable";

export class ContextKitCallbackHandler extends BaseCallbackHandler {
  name = "ContextKitCallbackHandler";

  async handleToolStart(
    tool: Serialized,
    input: string,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>,
    name?: string
  ) {
    console.log(`\n\x1b[36m[context-kit]\x1b[0m 🔧 Tool called: \x1b[33m${name ?? tool.id[tool.id.length - 1]}\x1b[0m`);
    // Parse input if it's JSON to make it readable
    let displayInput = input;
    try {
      const parsed = JSON.parse(input);
      if (Object.keys(parsed).length > 0) {
        displayInput = JSON.stringify(parsed, null, 2).replace(/\n/g, "\n              ");
      }
    } catch {}
    console.log(`\x1b[36m[context-kit]\x1b[0m    Input: ${displayInput}`);
  }

  async handleToolEnd(output: string) {
    const preview = output.length > 200 ? output.slice(0, 200) + "..." : output;
    const previewClean = preview.replace(/\n/g, " ");
    console.log(`\x1b[36m[context-kit]\x1b[0m    Output: ${previewClean}`);
  }

  async handleLLMStart(_llm: Serialized, prompts: string[]) {
    console.log(`\x1b[36m[context-kit]\x1b[0m 🤖 LLM call — prompt length: \x1b[32m${prompts[0]?.length} chars\x1b[0m`);
  }

  async handleLLMEnd(output: any) {
    const text = output.generations?.[0]?.[0]?.text;
    if (text) {
      const preview = text.length > 200 ? text.slice(0, 200) + "..." : text;
      const previewClean = preview.replace(/\n/g, " ");
      console.log(`\x1b[36m[context-kit]\x1b[0m    Response: ${previewClean}`);
    }
  }
}
