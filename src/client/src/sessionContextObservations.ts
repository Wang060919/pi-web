import type { ChatLine, ChatPart } from "./components/shared";

export type ContextReadState = "requested" | "completed" | "failed";
export type SessionContextObservation =
  | { kind: "skill-invocation"; name: string; path: string }
  | { kind: "skill-read"; name: string; path: string; state: ContextReadState }
  | { kind: "file-read"; path: string; state: ContextReadState }
  | { kind: "image"; mimeType: string; count: number };

export interface SessionContextObservations {
  references: SessionContextObservation[];
  hasCompaction: boolean;
}

function readState(part: Extract<ChatPart, { type: "toolExecution" }>): ContextReadState {
  return part.status === "success" ? "completed" : part.status === "error" ? "failed" : "requested";
}

function readPath(args: unknown): string | undefined {
  if (typeof args !== "object" || args === null || !("path" in args)) return undefined;
  return typeof args.path === "string" && args.path !== "" ? args.path : undefined;
}

/** Observe only loaded transcript metadata, never prompt text or image payloads. */
export function sessionContextObservations(messages: readonly ChatLine[]): SessionContextObservations {
  const results = new Map<string, ContextReadState>();
  for (const message of messages) {
    for (const part of message.parts) {
      if ((part.type !== "toolResult" && part.type !== "toolExecution") || part.toolName !== "read" || part.toolCallId === undefined || part.toolCallId === "") continue;
      results.set(part.toolCallId, part.type === "toolResult" ? (part.isError ? "failed" : "completed") : readState(part));
    }
  }
  const references: SessionContextObservation[] = [];
  const images = new Map<string, Extract<SessionContextObservation, { kind: "image" }>>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "skillInvocation") {
        references.push({ kind: "skill-invocation", name: part.name, path: part.location });
      } else if (part.type === "skillRead") {
        references.push({ kind: "skill-read", name: part.name, path: part.path, state: (part.toolCallId === undefined ? undefined : results.get(part.toolCallId)) ?? "requested" });
      } else if ((part.type === "toolExecution" || part.type === "toolCall") && part.toolName === "read") {
        const path = readPath(part.args);
        if (path === undefined) continue;
        const state = part.type === "toolExecution" ? readState(part) : (part.toolCallId === undefined ? undefined : results.get(part.toolCallId)) ?? "requested";
        references.push({ kind: "file-read", path, state });
      } else if (part.type === "image" && message.role === "user") {
        const image = images.get(part.mimeType);
        if (image === undefined) {
          const observation = { kind: "image" as const, mimeType: part.mimeType, count: 1 };
          images.set(part.mimeType, observation);
          references.push(observation);
        } else image.count += 1;
      }
    }
  }
  return { references, hasCompaction: messages.some((message) => message.source === "compaction") };
}
