import type { DiscoveredConfigurationModel, ModelDiscoveryResult } from "../../shared/modelConfiguration.js";
import { modelConfigurationRecord } from "../../shared/modelConfiguration.js";
import { ModelConfigurationError } from "./modelConfigurationStore.js";

const MAX_DISCOVERY_BYTES = 2 * 1024 * 1024;
const MAX_DISCOVERED_MODELS = 1000;

export interface ProviderDiscoveryRequest {
  baseUrl: string;
  api: string;
  apiKey: string | undefined;
  headers: Record<string, string> | undefined;
  signal: AbortSignal;
  fetch: typeof fetch;
}

export function modelDiscoveryUrl(baseUrl: string, api: string): URL {
  const url = new URL(baseUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username !== "" || url.password !== "") throw new ModelConfigurationError("Model discovery requires an HTTP or HTTPS endpoint without URL credentials");
  let path = url.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/models")) {
    if (api === "anthropic-messages" && !/\/v\d+$/.test(path)) path += "/v1";
    if (api === "google-generative-ai" && !/\/v\d+(?:beta)?$/.test(path)) path += "/v1beta";
    url.pathname = `${path}/models`;
  }
  return url;
}

function positiveNumber(row: Record<string, unknown>, names: string[]): number | undefined {
  for (const name of names) {
    const entry = row[name];
    if (typeof entry === "number" && Number.isSafeInteger(entry) && entry > 0) return entry;
  }
  return undefined;
}

export function discoveredModelsFromResponse(value: unknown): ModelDiscoveryResult {
  const raw = Array.isArray(value) ? value : Object.values(modelConfigurationRecord(value)).find(Array.isArray);
  if (!Array.isArray(raw)) throw new ModelConfigurationError("The endpoint did not return a model list");
  const models: DiscoveredConfigurationModel[] = [];
  const seen = new Set<string>();
  let truncated = false;
  for (const entry of raw) {
    if (models.length >= MAX_DISCOVERED_MODELS) { truncated = true; break; }
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const row = modelConfigurationRecord(entry);
    const rawId = row["id"] ?? row["name"];
    if (typeof rawId !== "string" || rawId.trim() === "" || rawId.length > 300) continue;
    const id = rawId.replace(/^models\//, "");
    if (seen.has(id)) continue;
    seen.add(id);
    const name = row["displayName"] ?? row["display_name"];
    const contextWindow = positiveNumber(row, ["contextWindow", "context_window", "context_length", "inputTokenLimit"]);
    const maxTokens = positiveNumber(row, ["max_output_tokens", "maxOutputTokens", "outputTokenLimit"]);
    models.push({ id, ...(typeof name === "string" && name !== "" ? { name } : {}), ...(contextWindow === undefined ? {} : { contextWindow }), ...(maxTokens === undefined ? {} : { maxTokens }) });
  }
  return { models, truncated };
}

export async function discoverProviderModels(request: ProviderDiscoveryRequest): Promise<ModelDiscoveryResult> {
  const headers = new Headers(request.headers);
  headers.set("accept", "application/json");
  if (request.apiKey !== undefined) {
    if (request.api === "anthropic-messages") { headers.set("x-api-key", request.apiKey); headers.set("anthropic-version", "2023-06-01"); }
    else if (request.api === "google-generative-ai") headers.set("x-goog-api-key", request.apiKey);
    else if (!headers.has("authorization")) headers.set("authorization", `Bearer ${request.apiKey}`);
  }
  // A redirect could send custom credential headers to another origin.
  const response = await request.fetch(modelDiscoveryUrl(request.baseUrl, request.api), { headers, signal: request.signal, redirect: "error" });
  if (!response.ok) throw new ModelConfigurationError(`Model discovery returned HTTP ${String(response.status)}`);
  if (Number(response.headers.get("content-length")) > MAX_DISCOVERY_BYTES) throw new ModelConfigurationError("Model discovery response exceeds the size limit");
  if (response.body === null) throw new ModelConfigurationError("The endpoint returned an empty model list response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > MAX_DISCOVERY_BYTES) throw new ModelConfigurationError("Model discovery response exceeds the size limit");
      chunks.push(result.value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new ModelConfigurationError("The model discovery endpoint returned invalid JSON"); }
  return discoveredModelsFromResponse(parsed);
}
