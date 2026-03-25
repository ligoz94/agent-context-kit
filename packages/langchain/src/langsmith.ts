export function enableLangSmith(options?: {
  projectName?: string;
  tags?: string[];
}) {
  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_PROJECT = options?.projectName ?? "agent-context-kit";
  
  if (options?.tags && options.tags.length > 0) {
    process.env.LANGCHAIN_TAGS = options.tags.join(",");
  }
  
  // Notice: LANGCHAIN_API_KEY must be provided via the environment.
  // We do not manage it here for security reasons.
}
