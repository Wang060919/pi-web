import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import { ModelRuntime, readStoredCredential } from "@earendil-works/pi-coding-agent";
import {
  MODEL_SECRET_UNCHANGED, modelConfigurationRecord, parseConfiguredProvider,
  type ConfiguredModel, type ConfiguredProvider, type ModelConfigurationResponse, type ModelConnectionResult, type ModelDiscoveryResult,
} from "../../shared/modelConfiguration.js";
import { ModelConfigurationError, ModelConfigurationStore, type StoredModelConfiguration } from "./modelConfigurationStore.js";
import { discoverProviderModels } from "./modelDiscovery.js";
import type { ModelConfigurationRuntimeGate } from "./modelConfigurationRuntimeGate.js";

export type ConfigurationRuntime = Pick<ModelRuntime, "getModel" | "getModels" | "getAuth" | "getError" | "completeSimple">;
export interface ModelConfigurationServiceOptions {
  agentDir: string;
  onSaved?: () => Promise<void>;
  runtimeGate?: ModelConfigurationRuntimeGate;
  createRuntime?: (config: Record<string, unknown>, providerId: string, signal: AbortSignal) => Promise<ConfigurationRuntime>;
  fetch?: typeof fetch;
}

const PROVIDER_FIELDS = ["baseUrl", "api", "apiKey", "headers"] as const;
const MODEL_FIELDS = ["name", "api", "baseUrl", "headers", "reasoning", "input", "contextWindow", "maxTokens", "cost", "thinkingLevelMap"] as const;

function objectOrEmpty(value: unknown): Record<string, unknown> { return value === undefined ? {} : modelConfigurationRecord(value); }
function ownEntry(record: Record<string, unknown>, key: string): unknown { return Object.hasOwn(record, key) ? record[key] : undefined; }
function urlOrigin(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  let url: URL;
  try { url = new URL(value); } catch { throw new ModelConfigurationError("Base URL must be an absolute HTTP or HTTPS URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new ModelConfigurationError("Base URL must use HTTP or HTTPS");
  if (url.username !== "" || url.password !== "" || url.hash !== "") throw new ModelConfigurationError("Base URL cannot contain credentials or a fragment; use API key or headers");
  return url.origin;
}
function hiddenUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value);
    return url.username !== "" || url.password !== "" || url.search !== "" ? MODEL_SECRET_UNCHANGED : value;
  } catch { return MODEL_SECRET_UNCHANGED; }
}
function maskHeaders(value: unknown): unknown {
  return value === undefined ? undefined : Object.fromEntries(Object.keys(modelConfigurationRecord(value)).map((key) => [key, MODEL_SECRET_UNCHANGED]));
}
function projectModel(id: string, source: unknown, override = false): ConfiguredModel {
  const row = modelConfigurationRecord(source);
  const projected: Record<string, unknown> = { id, ...(override ? { override: true } : {}) };
  for (const key of MODEL_FIELDS) if (row[key] !== undefined) projected[key] = key === "headers" ? maskHeaders(row[key]) : key === "baseUrl" ? hiddenUrl(row[key]) : row[key];
  return parseConfiguredProvider({ id: "projection", models: [projected] }).models[0] ?? { id };
}
function response(snapshot: StoredModelConfiguration): ModelConfigurationResponse {
  const providers = Object.entries(objectOrEmpty(snapshot.config["providers"])).map(([id, value]) => {
    const source = modelConfigurationRecord(value);
    const models = source["models"];
    if (models !== undefined && !Array.isArray(models)) throw new ModelConfigurationError("Existing provider models must be an array", 409);
    const projected: Record<string, unknown> = { id, models: [
      ...(Array.isArray(models) ? models.map((model) => { const row = modelConfigurationRecord(model); if (typeof row["id"] !== "string") throw new ModelConfigurationError("Existing model has no ID", 409); return projectModel(row["id"], row); }) : []),
      ...Object.entries(objectOrEmpty(source["modelOverrides"])).map(([modelId, model]) => projectModel(modelId, model, true)),
    ] };
    for (const key of PROVIDER_FIELDS) if (source[key] !== undefined) projected[key] = key === "apiKey" ? MODEL_SECRET_UNCHANGED : key === "headers" ? maskHeaders(source[key]) : key === "baseUrl" ? hiddenUrl(source[key]) : source[key];
    return parseConfiguredProvider(projected);
  });
  return { revision: snapshot.revision, providers };
}

function mergeFields(source: Record<string, unknown>, draft: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const result = { ...source };
  for (const key of keys) {
    const value = draft[key];
    if (value === undefined) Reflect.deleteProperty(result, key);
    else if (value === MODEL_SECRET_UNCHANGED) {
      if (typeof source[key] !== "string") throw new ModelConfigurationError("A hidden secret can only be kept on its original provider or model");
    } else if (key === "headers") {
      const oldHeaders = objectOrEmpty(source[key]);
      result[key] = Object.fromEntries(Object.entries(modelConfigurationRecord(value)).map(([name, entry]) => {
        if (entry !== MODEL_SECRET_UNCHANGED) return [name, entry];
        if (typeof oldHeaders[name] !== "string") throw new ModelConfigurationError("A hidden header can only be kept under its original name");
        return [name, oldHeaders[name]];
      }));
    } else if (key === "cost") {
      const cost = { ...objectOrEmpty(source[key]) };
      const next = modelConfigurationRecord(value);
      for (const field of ["input", "output", "cacheRead", "cacheWrite"]) {
        if (next[field] === undefined) Reflect.deleteProperty(cost, field); else cost[field] = next[field];
      }
      result[key] = cost;
    } else result[key] = value;
  }
  return result;
}

function providerConfig(draft: ConfiguredProvider, old: unknown): Record<string, unknown> {
  const source = objectOrEmpty(old);
  const next = mergeFields(source, modelConfigurationRecord(draft), PROVIDER_FIELDS);
  const oldModels = source["models"];
  const oldModelMap = new Map<string, unknown>();
  if (Array.isArray(oldModels)) for (const model of oldModels) { const row = modelConfigurationRecord(model); if (typeof row["id"] === "string") oldModelMap.set(row["id"], row); }
  const oldOverrides = objectOrEmpty(source["modelOverrides"]);
  const models: Record<string, unknown>[] = [];
  const overrides: Record<string, unknown> = {};
  for (const model of draft.models) {
    const original = objectOrEmpty(model.override === true ? ownEntry(oldOverrides, model.id) : oldModelMap.get(model.id));
    const merged = mergeFields(original, modelConfigurationRecord(model), MODEL_FIELDS);
    if (model.override === true) Object.defineProperty(overrides, model.id, { value: merged, enumerable: true });
    else models.push({ ...merged, id: model.id });
  }
  if (models.length > 0 || source["models"] !== undefined) next["models"] = models;
  if (Object.keys(overrides).length > 0 || source["modelOverrides"] !== undefined) next["modelOverrides"] = overrides;
  return next;
}

function collectSecrets(value: unknown): string[] {
  const root = objectOrEmpty(value);
  const secrets: string[] = [];
  for (const [key, child] of Object.entries(root)) {
    if ((key === "apiKey" || key === "headers") && typeof child === "string") secrets.push(child);
    else if (key === "baseUrl" && typeof child === "string" && hiddenUrl(child) === MODEL_SECRET_UNCHANGED) {
      secrets.push(child);
      try { const url = new URL(child); secrets.push(...url.searchParams.values(), url.username, url.password); } catch { /* The complete invalid value is already covered. */ }
    }
    else if (key === "headers" && typeof child === "object" && child !== null) secrets.push(...Object.values(modelConfigurationRecord(child)).filter((entry): entry is string => typeof entry === "string"));
    else if (Array.isArray(child)) for (const row of child) secrets.push(...collectSecrets(row));
    else if (typeof child === "object" && child !== null) secrets.push(...collectSecrets(child));
  }
  for (const secret of [...secrets]) {
    for (const match of secret.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g)) {
      const name = match[1];
      if (name !== undefined && process.env[name] !== undefined) secrets.push(process.env[name]);
    }
  }
  return secrets;
}
function redacted(message: string, secrets: readonly string[]): string {
  let result = message;
  for (const secret of secrets) if (secret !== "" && secret !== MODEL_SECRET_UNCHANGED) result = result.split(secret).join("[redacted]");
  return result.slice(0, 1000);
}

export class ModelConfigurationService {
  private readonly store: ModelConfigurationStore;
  private readonly createRuntime: NonNullable<ModelConfigurationServiceOptions["createRuntime"]>;
  constructor(private readonly options: ModelConfigurationServiceOptions) {
    this.store = new ModelConfigurationStore(join(options.agentDir, "models.json"));
    this.createRuntime = options.createRuntime ?? ((config, providerId, signal) => this.newRuntime(config, providerId, signal));
  }

  async read(): Promise<ModelConfigurationResponse> { return response(await this.store.read()); }

  async write(revision: string, values: readonly ConfiguredProvider[]): Promise<ModelConfigurationResponse> {
    if (this.options.runtimeGate !== undefined) return this.options.runtimeGate.save(() => this.writeConfiguration(revision, values));
    return this.writeConfiguration(revision, values);
  }

  private async writeConfiguration(revision: string, values: readonly ConfiguredProvider[]): Promise<ModelConfigurationResponse> {
    if (values.length > 100) throw new ModelConfigurationError("Too many providers");
    const providers = values.map(parseConfiguredProvider);
    if (new Set(providers.map((provider) => provider.id)).size !== providers.length) throw new ModelConfigurationError("Duplicate provider ID");
    const snapshot = await this.store.update(revision, async (current) => {
      const oldProviders = objectOrEmpty(current["providers"]);
      const nextProviders: Record<string, unknown> = {};
      for (const provider of providers) {
        const original = ownEntry(oldProviders, provider.id);
        const next = providerConfig(provider, original);
        await this.guardCredentials(provider, next, original, true);
        nextProviders[provider.id] = next;
      }
      const next = { ...current, providers: nextProviders };
      const runtime = await this.createRuntime(next, "", AbortSignal.timeout(20_000));
      if (runtime.getError() !== undefined) throw new ModelConfigurationError(redacted(runtime.getError() ?? "Invalid model configuration", collectSecrets(next)));
      this.options.runtimeGate?.assertTransition(current, next);
      return next;
    });
    this.options.runtimeGate?.saved(snapshot.config);
    let refreshWarning = false;
    try { await this.options.onSaved?.(); } catch { refreshWarning = true; }
    return { ...response(snapshot), ...(refreshWarning ? { refreshWarning: true } : {}) };
  }

  async discover(value: ConfiguredProvider): Promise<ModelDiscoveryResult> {
    const { provider, config } = await this.prepareDraft(value);
    const signal = AbortSignal.timeout(20_000);
    const configured = objectOrEmpty(objectOrEmpty(config["providers"])[provider.id]);
    this.requireDiagnosticCredentials(configured);
    // A model makes the SDK resolve provider headers too, before any real model was added.
    const probeConfig = { providers: { [provider.id]: { ...configured, models: [{ id: "pi-web-discovery-probe", contextWindow: 1024, maxTokens: 16 }] } } };
    const runtime = await this.createRuntime(probeConfig, provider.id, signal);
    this.requireRuntime(runtime, probeConfig);
    const model = runtime.getModels(provider.id)[0];
    const baseUrl = typeof configured["baseUrl"] === "string" ? configured["baseUrl"] : model?.baseUrl;
    if (baseUrl === undefined) throw new ModelConfigurationError("Set a Base URL before discovering models");
    const api = typeof configured["api"] === "string" ? configured["api"] : model?.api ?? "openai-completions";
    const auth = model === undefined ? await runtime.getAuth(provider.id, { signal }) : await runtime.getAuth(model, { signal });
    const resolvedHeaders = Object.fromEntries(Object.entries(auth?.auth.headers ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    const secrets = [...collectSecrets(config), ...(auth?.auth.apiKey === undefined ? [] : [auth.auth.apiKey]), ...Object.values(resolvedHeaders)];
    try {
      return await discoverProviderModels({ baseUrl, api, apiKey: auth?.auth.apiKey, headers: resolvedHeaders, signal, fetch: this.options.fetch ?? fetch });
    } catch (error) { throw new ModelConfigurationError(redacted(error instanceof Error ? error.message : "Model discovery failed", secrets)); }
  }

  async test(value: ConfiguredProvider, modelId: string): Promise<ModelConnectionResult> {
    const { provider, config } = await this.prepareDraft(value);
    this.requireDiagnosticCredentials(objectOrEmpty(objectOrEmpty(config["providers"])[provider.id]));
    const signal = AbortSignal.timeout(20_000);
    const started = Date.now();
    const secrets = collectSecrets(config);
    try {
      const runtime = await this.createRuntime(config, provider.id, signal);
      this.requireRuntime(runtime, config);
      const model = runtime.getModel(provider.id, modelId);
      if (model === undefined) throw new ModelConfigurationError("The selected model could not be loaded by Pi");
      const auth = await runtime.getAuth(model, { signal });
      if (auth?.auth.apiKey !== undefined) secrets.push(auth.auth.apiKey);
      secrets.push(...Object.values(auth?.auth.headers ?? {}).filter((entry): entry is string => typeof entry === "string"));
      let status: number | undefined;
      const message = await runtime.completeSimple(model, { messages: [{ role: "user", content: "Reply with OK only.", timestamp: Date.now() }] }, {
        maxTokens: 16, maxRetries: 0, timeoutMs: 20_000, cacheRetention: "none", signal, transport: "sse",
        fetch: (input, init) => (this.options.fetch ?? fetch)(input, { ...init, redirect: "error" }),
        onPayload: boundedModelTestPayload,
        onResponse: (received) => { status = received.status; },
      });
      const meta = { latencyMs: Date.now() - started, ...(status === undefined ? {} : { status }) };
      if (message.stopReason === "error" || message.stopReason === "aborted") return { ...meta, ok: false, error: redacted(message.errorMessage ?? "Model request failed", secrets) };
      return { ...meta, ok: true, responseText: redacted(message.content.filter((block) => block.type === "text").map((block) => block.text).join("").slice(0, 300), secrets) };
    } catch (error) { return { ok: false, latencyMs: Date.now() - started, error: redacted(error instanceof Error ? error.message : "Model test failed", secrets) }; }
  }

  private requireRuntime(runtime: ConfigurationRuntime, config: Record<string, unknown>): void {
    const error = runtime.getError();
    if (error !== undefined) throw new ModelConfigurationError(redacted(error, collectSecrets(config)));
  }

  private requireDiagnosticCredentials(config: Record<string, unknown>): void {
    if (collectSecrets(config).some((value) => value.startsWith("!"))) throw new ModelConfigurationError("Connection diagnostics do not execute shell credential commands. Use a literal key or environment reference in the draft");
  }

  private async prepareDraft(value: ConfiguredProvider): Promise<{ provider: ConfiguredProvider; config: Record<string, unknown> }> {
    const provider = parseConfiguredProvider(value);
    const stored = await this.store.read();
    const old = ownEntry(objectOrEmpty(stored.config["providers"]), provider.id);
    const configured = providerConfig(provider, old);
    await this.guardCredentials(provider, configured, old);
    return { provider, config: { providers: { [provider.id]: configured } } };
  }

  private async guardCredentials(draft: ConfiguredProvider, configured: Record<string, unknown>, oldValue: unknown, saving = false): Promise<void> {
    const old = objectOrEmpty(oldValue);
    const baseline = await this.createRuntime({ providers: {} }, "", AbortSignal.timeout(20_000));
    const defaultModel = baseline.getModels(draft.id)[0];
    const oldBase = typeof old["baseUrl"] === "string" ? old["baseUrl"] : defaultModel?.baseUrl;
    const newBase = typeof configured["baseUrl"] === "string" ? configured["baseUrl"] : defaultModel?.baseUrl;
    const oldOrigin = urlOrigin(oldBase);
    const newOrigin = urlOrigin(newBase);
    const storedCredential = readStoredCredential(draft.id, join(this.options.agentDir, "auth.json"));
    // A missing draft key may use a login or built-in environment credential,
    // but an anonymous provider has no credential to carry to another origin.
    const implicitAuth = draft.apiKey === undefined ? await baseline.getAuth(draft.id) : undefined;
    const reusedKey = draft.apiKey === MODEL_SECRET_UNCHANGED
      || (draft.apiKey === undefined && (storedCredential !== undefined || implicitAuth !== undefined));
    const oldModels = old["models"];
    const knownModelOrigins = Array.isArray(oldModels) ? oldModels.flatMap((entry: unknown) => {
      const row = modelConfigurationRecord(entry);
      return typeof row["baseUrl"] === "string" ? [urlOrigin(row["baseUrl"])] : [];
    }) : [];
    if (reusedKey && oldOrigin === undefined && knownModelOrigins.every((origin) => origin === undefined)
      && storedCredential !== undefined) {
      throw new ModelConfigurationError("No trusted previous endpoint is known for this provider. Enter a new API key before using a stored provider name with a new endpoint");
    }
    const reusedHeaders = (headers: Record<string, string> | undefined) => Object.values(headers ?? {}).includes(MODEL_SECRET_UNCHANGED);
    const rejectReuse = (changed: boolean, model?: ConfiguredModel): void => {
      if (changed && (reusedKey || reusedHeaders(draft.headers) || reusedHeaders(model?.headers))) throw new ModelConfigurationError("The endpoint origin changed. Enter a new API key and replace stored headers before using credentials with the new origin");
    };
    const rejectStoredLoginAtNewOrigin = (origin: string | undefined, previous: string | undefined): void => {
      if (saving && storedCredential !== undefined && origin !== undefined && origin !== previous) throw new ModelConfigurationError("Stored login credentials take precedence over models.json keys. Remove the provider's stored login before saving a new endpoint origin", 409);
    };
    rejectStoredLoginAtNewOrigin(newOrigin, oldOrigin);
    rejectReuse(oldOrigin !== newOrigin && (oldOrigin !== undefined || oldValue !== undefined || defaultModel !== undefined));
    for (const model of draft.models) {
      const currentModel = baseline.getModel(draft.id, model.id);
      const sourceModels = old["models"];
      const source: unknown = model.override === true ? ownEntry(objectOrEmpty(old["modelOverrides"]), model.id) : Array.isArray(sourceModels) ? sourceModels.find((entry: unknown) => modelConfigurationRecord(entry)["id"] === model.id) : undefined;
      const previous = objectOrEmpty(source);
      const oldModelOrigin = urlOrigin(typeof previous["baseUrl"] === "string" ? previous["baseUrl"] : oldBase ?? currentModel?.baseUrl ?? newBase);
      const newModelBase = model.baseUrl === MODEL_SECRET_UNCHANGED ? previous["baseUrl"] : model.baseUrl;
      const nextModelOrigin = urlOrigin(typeof newModelBase === "string" ? newModelBase : newBase ?? currentModel?.baseUrl);
      rejectStoredLoginAtNewOrigin(nextModelOrigin, oldModelOrigin);
      rejectReuse(oldModelOrigin !== nextModelOrigin && (oldModelOrigin !== undefined || oldValue !== undefined || defaultModel !== undefined), model);
    }
  }

  private async newRuntime(config: Record<string, unknown>, providerId: string, signal: AbortSignal): Promise<ConfigurationRuntime> {
    const directory = await mkdtemp(join(tmpdir(), "pi-web-model-config-"));
    try {
      const modelsPath = join(directory, "models.json");
      await writeFile(modelsPath, JSON.stringify(config), { mode: 0o600 });
      const credentials = new InMemoryCredentialStore();
      const configured = ownEntry(objectOrEmpty(config["providers"]), providerId);
      // Explicit draft/config keys must win over unrelated stale login credentials.
      if (providerId !== "" && objectOrEmpty(configured)["apiKey"] === undefined) {
        const stored = readStoredCredential(providerId, join(this.options.agentDir, "auth.json"));
        if (stored !== undefined) await credentials.modify(providerId, () => Promise.resolve(stored), { signal });
      }
      return await ModelRuntime.create({ modelsPath, credentials, modelsStorePath: join(this.options.agentDir, "models-store.json"), allowModelNetwork: false, refreshOnCreate: false, signal });
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}

/** Model-level sampling overrides must not turn a connection check into a large request. */
export function boundedModelTestPayload(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return payload;
  const row = modelConfigurationRecord(payload);
  const next = { ...row };
  for (const key of ["max_tokens", "max_completion_tokens", "max_output_tokens"]) if (next[key] !== undefined) next[key] = 16;
  if (typeof next["generationConfig"] === "object" && next["generationConfig"] !== null) next["generationConfig"] = { ...modelConfigurationRecord(next["generationConfig"]), maxOutputTokens: 16 };
  return next;
}
