import { isDeepStrictEqual } from "node:util";
import { modelConfigurationRecord } from "../../shared/modelConfiguration.js";
import { ModelConfigurationError } from "./modelConfigurationStore.js";

const SAFE_MODEL_METADATA = new Set(["id", "name", "reasoning", "input", "contextWindow", "maxTokens", "cost", "thinkingLevelMap"]);

function record(value: unknown): Record<string, unknown> { return value === undefined ? {} : modelConfigurationRecord(value); }
function own(source: Record<string, unknown>, key: string): unknown { return Object.hasOwn(source, key) ? source[key] : undefined; }
function connectionFields(source: Record<string, unknown>, safe: ReadonlySet<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([key, value]) => !safe.has(key)
    && !(key === "headers" && Object.keys(record(value)).length === 0)));
}
function modelEntries(source: Record<string, unknown>): Map<string, Record<string, unknown>> {
  const entries = new Map<string, Record<string, unknown>>();
  const models = source["models"];
  if (Array.isArray(models)) for (const value of models) {
    const model = modelConfigurationRecord(value);
    if (typeof model["id"] !== "string") throw new ModelConfigurationError("Existing model has no ID", 409);
    entries.set(`model:${model["id"]}`, model);
  }
  for (const [id, value] of Object.entries(record(source["modelOverrides"]))) entries.set(`override:${id}`, modelConfigurationRecord(value));
  return entries;
}

function connectionChanged(previous: unknown, next: unknown): boolean {
  if (previous !== undefined && next === undefined) return true;
  const before = record(previous);
  const after = record(next);
  const providerMetadata = new Set(["name", "models", "modelOverrides"]);
  if (!isDeepStrictEqual(connectionFields(before, providerMetadata), connectionFields(after, providerMetadata))) return true;
  const oldModels = modelEntries(before);
  const newModels = modelEntries(after);
  for (const [id, model] of oldModels) {
    const replacement = newModels.get(id);
    if (replacement === undefined || !isDeepStrictEqual(connectionFields(model, SAFE_MODEL_METADATA), connectionFields(replacement, SAFE_MODEL_METADATA))) return true;
  }
  // New metadata-only models inherit the unchanged provider connection. New
  // per-model endpoints/headers could reuse its credentials at another origin.
  for (const [id, model] of newModels) if (!oldModels.has(id) && Object.keys(connectionFields(model, SAFE_MODEL_METADATA)).length > 0) return true;
  return false;
}

/**
 * One daemon epoch owns model objects retained by sessions, pending starts,
 * scoped-model caches and closing runtimes. Never infer their absence from
 * activeCount(): after the first construction, connection changes need a new
 * daemon epoch. Metadata edits and genuinely new provider IDs remain usable.
 */
export class ModelConfigurationRuntimeGate {
  private runtimeConstructionStarted = false;
  private saving = false;
  private readonly knownProviderIds = new Set<string>();

  constructor(private readonly providerIds: () => readonly string[]) { this.rememberProviders(); }

  beforeRuntimeConstruction(): void {
    if (this.saving) throw new ModelConfigurationError("Model configuration is being saved. Retry opening the conversation after the save finishes", 409);
    // Synchronous and permanent, including failed/pending/closing runtimes.
    this.runtimeConstructionStarted = true;
    this.rememberProviders();
  }

  async save<T>(operation: () => Promise<T>): Promise<T> {
    if (this.saving) throw new ModelConfigurationError("Another model configuration save is in progress; reload and retry", 409);
    this.saving = true;
    try { this.rememberProviders(); return await operation(); }
    finally { try { this.rememberProviders(); } finally { this.saving = false; } }
  }

  assertTransition(previous: Record<string, unknown>, next: Record<string, unknown>): void {
    const oldProviders = record(previous["providers"]);
    const newProviders = record(next["providers"]);
    this.rememberProviders();
    for (const id of Object.keys(oldProviders)) this.knownProviderIds.add(id);
    if (!this.runtimeConstructionStarted) return;
    for (const id of this.knownProviderIds) if (connectionChanged(own(oldProviders, id), own(newProviders, id))) {
      throw new ModelConfigurationError(
        "Existing provider connections cannot change after this daemon has constructed a conversation. Use a genuinely new provider ID, or close PI WEB chat pages, safely restart the session daemon from an external terminal, then open the PI WEB base URL with ?settings=models and no project, workspace or session parameters and save before reopening conversations", 409,
      );
    }
  }

  saved(config: Record<string, unknown>): void { for (const id of Object.keys(record(config["providers"]))) this.knownProviderIds.add(id); }
  private rememberProviders(): void { for (const id of this.providerIds()) this.knownProviderIds.add(id); }
}
