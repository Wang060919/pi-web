/** A browser never receives the stored value behind this placeholder. */
export const MODEL_SECRET_UNCHANGED = "__PI_WEB_KEEP_SECRET__";

export interface ConfiguredModel {
  id: string;
  name?: string;
  api?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  reasoning?: boolean;
  input?: ("text" | "image")[];
  contextWindow?: number;
  maxTokens?: number;
  cost?: Partial<{ input: number; output: number; cacheRead: number; cacheWrite: number }>;
  thinkingLevelMap?: Record<string, string | null>;
  /** Writes to modelOverrides rather than replacing the provider's model list. */
  override?: boolean;
}

export interface ConfiguredProvider {
  id: string;
  baseUrl?: string;
  api?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  models: ConfiguredModel[];
}

export interface ModelConfigurationResponse {
  revision: string;
  providers: ConfiguredProvider[];
  /** Saving succeeded, but refreshing a runtime may require a retry. */
  refreshWarning?: boolean;
}

export interface ModelConnectionResult {
  ok: boolean;
  latencyMs: number;
  status?: number;
  error?: string;
  responseText?: string;
}

export interface DiscoveredConfigurationModel {
  id: string;
  name?: string;
  contextWindow?: number;
  maxTokens?: number;
}

export interface ModelDiscoveryResult {
  models: DiscoveredConfigurationModel[];
  truncated: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export function modelConfigurationRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error("Expected a model configuration object");
  return value;
}

function text(value: unknown, field: string, limit = 4096): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > limit || value.includes(String.fromCharCode(0)) || /[\r\n]/.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function optionalText(record: Record<string, unknown>, field: string): string | undefined {
  return record[field] === undefined ? undefined : text(record[field], field);
}

function tokenCount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${field}`);
  return value;
}

function headers(value: unknown): Record<string, string> {
  const entries = Object.entries(modelConfigurationRecord(value));
  if (entries.length > 100) throw new Error("Too many headers");
  return Object.fromEntries(entries.map(([key, entry]) => {
    if (!/^[!#$%&'*+.^_`|~\w-]+$/.test(key)) throw new Error("Invalid header name");
    if (typeof entry !== "string" || entry.length > 16_384 || entry.includes(String.fromCharCode(0)) || /[\r\n]/.test(entry)) throw new Error("Invalid header value");
    return [key, entry];
  }));
}

export function parseConfiguredModel(value: unknown): ConfiguredModel {
  const source = modelConfigurationRecord(value);
  const result: ConfiguredModel = { id: text(source["id"], "model ID", 300) };
  for (const key of ["name", "api", "baseUrl"] as const) {
    const entry = optionalText(source, key);
    if (entry !== undefined) result[key] = entry;
  }
  if (source["headers"] !== undefined) result.headers = headers(source["headers"]);
  for (const key of ["reasoning", "override"] as const) {
    const entry = source[key];
    if (entry !== undefined) {
      if (typeof entry !== "boolean") throw new Error(`Invalid ${key}`);
      result[key] = entry;
    }
  }
  if (source["input"] !== undefined) {
    const input = source["input"];
    if (!Array.isArray(input) || input.length === 0 || !input.every((entry): entry is "text" | "image" => entry === "text" || entry === "image")) throw new Error("Invalid model input capabilities");
    result.input = [...new Set(input)];
  }
  for (const key of ["contextWindow", "maxTokens"] as const) if (source[key] !== undefined) result[key] = tokenCount(source[key], key);
  if (source["cost"] !== undefined) {
    const cost = modelConfigurationRecord(source["cost"]);
    const parsed: NonNullable<ConfiguredModel["cost"]> = {};
    for (const key of ["input", "output", "cacheRead", "cacheWrite"] as const) {
      const entry = cost[key];
      if (entry === undefined) continue;
      if (typeof entry !== "number" || !Number.isFinite(entry) || entry < 0) throw new Error("Invalid model cost");
      parsed[key] = entry;
    }
    result.cost = parsed;
  }
  if (source["thinkingLevelMap"] !== undefined) {
    const entries = Object.entries(modelConfigurationRecord(source["thinkingLevelMap"]));
    result.thinkingLevelMap = Object.fromEntries(entries.map(([key, entry]) => {
      if (!["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(key)) throw new Error("Invalid thinking level");
      return [key, entry === null ? null : text(entry, "thinking mapping", 200)];
    }));
  }
  return result;
}

export function parseConfiguredProvider(value: unknown): ConfiguredProvider {
  const source = modelConfigurationRecord(value);
  const id = text(source["id"], "provider ID", 200);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) throw new Error("Invalid provider ID");
  const models = source["models"];
  if (!Array.isArray(models) || models.length > 1000) throw new Error("Invalid provider models");
  const result: ConfiguredProvider = { id, models: models.map(parseConfiguredModel) };
  const seen = new Set<string>();
  for (const model of result.models) {
    const key = `${model.override === true ? "override" : "model"}:${model.id}`;
    if (seen.has(key)) throw new Error("Duplicate model ID");
    seen.add(key);
  }
  for (const key of ["baseUrl", "api", "apiKey"] as const) {
    const entry = optionalText(source, key);
    if (entry !== undefined) result[key] = entry;
  }
  if (source["headers"] !== undefined) result.headers = headers(source["headers"]);
  return result;
}

export function parseModelConfigurationResponse(value: unknown): ModelConfigurationResponse {
  const source = modelConfigurationRecord(value);
  const providers = source["providers"];
  if (!Array.isArray(providers) || providers.length > 100) throw new Error("Invalid model providers");
  const result: ModelConfigurationResponse = { revision: text(source["revision"], "configuration revision", 100), providers: providers.map(parseConfiguredProvider) };
  if (source["refreshWarning"] === true) result.refreshWarning = true;
  return result;
}

export function parseModelConnectionResult(value: unknown): ModelConnectionResult {
  const source = modelConfigurationRecord(value);
  if (typeof source["ok"] !== "boolean" || typeof source["latencyMs"] !== "number" || !Number.isFinite(source["latencyMs"])) throw new Error("Invalid model test response");
  return {
    ok: source["ok"], latencyMs: source["latencyMs"],
    ...(typeof source["status"] === "number" ? { status: source["status"] } : {}),
    ...(typeof source["error"] === "string" ? { error: source["error"] } : {}),
    ...(typeof source["responseText"] === "string" ? { responseText: source["responseText"] } : {}),
  };
}

export function parseModelDiscoveryResult(value: unknown): ModelDiscoveryResult {
  const source = modelConfigurationRecord(value);
  if (!Array.isArray(source["models"]) || typeof source["truncated"] !== "boolean") throw new Error("Invalid discovery response");
  return { models: source["models"].map((entry) => {
    const row = modelConfigurationRecord(entry);
    return { id: text(row["id"], "discovered model ID", 300), ...(typeof row["name"] === "string" ? { name: row["name"] } : {}),
      ...(row["contextWindow"] === undefined ? {} : { contextWindow: tokenCount(row["contextWindow"], "context window") }),
      ...(row["maxTokens"] === undefined ? {} : { maxTokens: tokenCount(row["maxTokens"], "output tokens") }) };
  }), truncated: source["truncated"] };
}
