import type { SessionInspection } from "../../shared/runtimeInspection.js";

/** Current SDK state, never a reconstruction from config or a historical transcript. */
export function inspectSession(session: {
  readonly systemPrompt?: string;
  readonly state: { readonly tools?: readonly { name: string; description: string; parameters: object }[] };
}): SessionInspection {
  if (session.systemPrompt === undefined || session.state.tools === undefined) throw new Error("This runtime cannot report its prompt and tools; update and restart the session daemon");
  return { source: "active-runtime", systemPrompt: session.systemPrompt, tools: session.state.tools.map((tool) => ({
    name: tool.name, description: tool.description, parameters: { ...tool.parameters },
  })) };
}
