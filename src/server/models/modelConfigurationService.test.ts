import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Api, type AssistantMessage, type Model } from "@earendil-works/pi-ai";
import { MODEL_SECRET_UNCHANGED, modelConfigurationRecord, type ConfiguredProvider } from "../../shared/modelConfiguration.js";
import { boundedModelTestPayload, ModelConfigurationService, type ConfigurationRuntime } from "./modelConfigurationService.js";
import { ModelConfigurationRuntimeGate } from "./modelConfigurationRuntimeGate.js";

const folders: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))); });

const model: Model<Api> = { id: "test-model", name: "Test model", provider: "test", api: "openai-completions", baseUrl: "https://provider.example/v1", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 4096, maxTokens: 256 };
const answer: AssistantMessage = { role: "assistant", api: model.api, provider: model.provider, model: model.id, content: [{ type: "text", text: "OK" }], stopReason: "stop", timestamp: 1, usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } };

function runtime(): ConfigurationRuntime {
  return { getModel: () => model, getModels: () => [model], getError: () => undefined,
    getAuth: vi.fn(() => Promise.resolve(undefined)), completeSimple: vi.fn(() => Promise.resolve(answer)) };
}
async function directory(): Promise<string> { const path = await mkdtemp(join(tmpdir(), "pi-web-model-settings-test-")); folders.push(path); return path; }
function fixture(): Record<string, unknown> {
  return { futureTop: { keep: true }, providers: { test: { baseUrl: "https://provider.example/v1", api: "openai-completions", apiKey: "stored-private-key", headers: { "x-private": "stored-private-header" }, futureProvider: { keep: true }, models: [{ id: "test-model", name: "Original", contextWindow: 4096, maxTokens: 100, headers: { "x-model-private": "model-secret" }, futureModel: true }], modelOverrides: { builtin: { contextWindow: 12345, cost: { input: 1 }, futureOverride: true } } } } };
}
function draft(overrides: Partial<ConfiguredProvider> = {}): ConfiguredProvider { return { id: "test", baseUrl: "https://provider.example/v1", api: "openai-completions", apiKey: "new-key", models: [{ id: "test-model", contextWindow: 4096, maxTokens: 100 }], ...overrides }; }

describe("model configuration", () => {
  it("rejects connection saves after runtime construction without replacing credentials or refreshing", async () => {
    const path = await directory(); const raw = JSON.stringify(fixture()); await writeFile(join(path, "models.json"), raw);
    const gate = new ModelConfigurationRuntimeGate(() => ["test", "openai"]);
    gate.beforeRuntimeConstruction();
    const saved = vi.fn(() => Promise.resolve());
    const service = new ModelConfigurationService({ agentDir: path, runtimeGate: gate, onSaved: saved, createRuntime: () => Promise.resolve(runtime()) });
    const first = await service.read();
    const provider = first.providers[0]; if (provider === undefined) throw new Error("missing provider");
    await expect(service.write(first.revision, [{ ...provider, apiKey: "new-key" }])).rejects.toMatchObject({ statusCode: 409 });
    expect(await readFile(join(path, "models.json"), "utf8")).toBe(raw);
    expect(saved).not.toHaveBeenCalled();
    await expect(service.write(first.revision, [{ ...provider, models: provider.models.map((row) => ({ ...row, name: "Updated" })) }])).resolves.toMatchObject({ providers: [{ models: [{ name: "Updated" }, {}] }] });
    expect(saved).toHaveBeenCalledOnce();
  });

  it("holds runtime admission through atomic save and the complete catalog refresh", async () => {
    const path = await directory();
    const gate = new ModelConfigurationRuntimeGate(() => ["openai"]);
    let finishRefresh = () => { /* assigned below */ };
    let refreshStarted = () => { /* assigned below */ };
    const refreshing = new Promise<void>((resolve) => { finishRefresh = resolve; });
    const entered = new Promise<void>((resolve) => { refreshStarted = resolve; });
    const service = new ModelConfigurationService({ agentDir: path, runtimeGate: gate, createRuntime: () => Promise.resolve(runtime()), onSaved: async () => { refreshStarted(); await refreshing; } });
    const save = service.write("missing", [draft()]);
    expect(() => { gate.beforeRuntimeConstruction(); }).toThrow("being saved");
    await entered;
    expect(await readFile(join(path, "models.json"), "utf8")).toContain("new-key");
    expect(() => { gate.beforeRuntimeConstruction(); }).toThrow("being saved");
    finishRefresh(); await save;
    expect(() => { gate.beforeRuntimeConstruction(); }).not.toThrow();
    const latest = await service.read();
    await expect(service.write(latest.revision, [draft({ apiKey: "another-key" })])).rejects.toThrow("Existing provider connections cannot change");
  });

  it("masks secrets and atomically preserves unknown fields, overrides and unchanged secrets", async () => {
    const path = await directory();
    await writeFile(join(path, "models.json"), `// compatible JSONC\n${JSON.stringify(fixture())}`);
    const saved = vi.fn(() => Promise.resolve());
    const service = new ModelConfigurationService({ agentDir: path, onSaved: saved, createRuntime: () => Promise.resolve(runtime()) });
    const first = await service.read();
    expect(JSON.stringify(first)).not.toContain("stored-private");
    const provider = first.providers[0]; if (provider === undefined) throw new Error("missing provider");
    expect(provider.apiKey).toBe(MODEL_SECRET_UNCHANGED);
    const updated = await service.write(first.revision, [provider]);
    expect(updated.revision).not.toBe(first.revision);
    expect(JSON.parse(await readFile(join(path, "models.json"), "utf8"))).toEqual(fixture());
    if (process.platform !== "win32") expect((await stat(join(path, "models.json"))).mode & 0o777).toBe(0o600);
    expect(saved).toHaveBeenCalledOnce();
  });

  it("rejects stale concurrent saves and retains malformed files", async () => {
    const path = await directory();
    const service = new ModelConfigurationService({ agentDir: path, createRuntime: () => Promise.resolve(runtime()) });
    const start = await service.read();
    const results = await Promise.allSettled([service.write(start.revision, [draft()]), service.write(start.revision, [])]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const invalid = '{"providers": broken-private-content';
    await writeFile(join(path, "models.json"), invalid);
    await expect(service.read()).rejects.toThrow("existing models.json is invalid");
    expect(await readFile(join(path, "models.json"), "utf8")).toBe(invalid);
  });

  it("explicitly removes a configured key and headers without changing the separate login store", async () => {
    const path = await directory(); await writeFile(join(path, "models.json"), JSON.stringify(fixture()));
    const auth = JSON.stringify({ test: { type: "api_key", key: "separate-login-key" } }); await writeFile(join(path, "auth.json"), auth);
    const service = new ModelConfigurationService({ agentDir: path, createRuntime: () => Promise.resolve(runtime()) });
    const first = await service.read(); const provider = first.providers[0]; if (provider === undefined) throw new Error("missing provider");
    const cleared = { ...provider, headers: { "x-empty": "" } }; delete cleared.apiKey;
    await service.write(first.revision, [cleared]);
    const raw = await readFile(join(path, "models.json"), "utf8");
    expect(raw).not.toContain("stored-private-key"); expect(raw).not.toContain("stored-private-header");
    expect(raw).toContain('"x-empty": ""');
    expect(await readFile(join(path, "auth.json"), "utf8")).toBe(auth);
  });

  it("refuses secret reuse across endpoint origins, including model-level endpoints", async () => {
    const path = await directory(); await writeFile(join(path, "models.json"), JSON.stringify(fixture()));
    const service = new ModelConfigurationService({ agentDir: path, createRuntime: () => Promise.resolve(runtime()) });
    const provider = (await service.read()).providers[0]; if (provider === undefined) throw new Error("missing provider");
    await expect(service.test({ ...provider, baseUrl: "https://another.example/v1" }, "test-model")).rejects.toThrow("origin changed");
    await expect(service.discover({ ...provider, baseUrl: "https://another.example/v1", apiKey: "explicit-new-key" })).rejects.toThrow("origin changed");
    await expect(service.test({ ...provider, models: provider.models.map((row) => ({ ...row, baseUrl: "https://another.example/v1" })) }, "test-model")).rejects.toThrow("origin changed");
    const result = await service.test({ ...draft(), baseUrl: "https://another.example/v1", apiKey: "explicit-new-key" }, "test-model");
    expect(result.ok).toBe(true);
  });

  it("rejects stale login fallback for a new custom provider whose previous endpoint is unknown", async () => {
    const path = await directory(); await writeFile(join(path, "auth.json"), JSON.stringify({ test: { type: "api_key", key: "retired-provider-secret" } }));
    const fetcher = vi.fn<typeof fetch>(() => Promise.reject(new Error("Unexpected network request")));
    const service = new ModelConfigurationService({ agentDir: path, fetch: fetcher });
    const provider = draft(); delete provider.apiKey;
    await expect(service.test(provider, "test-model")).rejects.toThrow("No trusted previous endpoint");
    await expect(service.discover(provider)).rejects.toThrow("No trusted previous endpoint");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(readFile(join(path, "models.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(service.write("missing", [draft()])).rejects.toThrow("Remove the provider's stored login");
    await expect(readFile(join(path, "models.json"))).rejects.toMatchObject({ code: "ENOENT" });
    await writeFile(join(path, "models.json"), JSON.stringify({ providers: { test: { api: "openai-completions", models: [{ id: "former", baseUrl: "https://old.example/v1" }] } } }));
    const newModelProvider = { ...provider, models: [{ id: "new-model", baseUrl: "https://new.example/v1" }] }; delete newModelProvider.baseUrl;
    await expect(service.test(newModelProvider, "new-model")).rejects.toThrow("origin changed");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("allows an anonymous local provider to change port for discovery, connection tests and saving", async () => {
    const path = await directory();
    const provider = draft({ baseUrl: "http://127.0.0.1:11434/v1" }); delete provider.apiKey;
    const { id, ...configured } = provider;
    await writeFile(join(path, "models.json"), JSON.stringify({ providers: { [id]: configured } }));
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ data: [{ id: "test-model" }] })));
    const service = new ModelConfigurationService({ agentDir: path, fetch: fetcher, createRuntime: () => Promise.resolve(runtime()) });
    const changed = { ...provider, baseUrl: "http://127.0.0.1:1234/v1" };
    expect(await service.discover(changed)).toMatchObject({ models: [{ id: "test-model" }] });
    expect(fetcher).toHaveBeenCalledOnce();
    const discoveryUrl = fetcher.mock.calls[0]?.[0];
    if (!(discoveryUrl instanceof URL)) throw new Error("Expected a model discovery URL");
    expect(discoveryUrl.href).toBe("http://127.0.0.1:1234/v1/models");
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).has("authorization")).toBe(false);
    expect(await service.test(changed, "test-model")).toMatchObject({ ok: true });
    const saved = await service.write((await service.read()).revision, [changed]);
    expect(saved.providers[0]).toMatchObject({ baseUrl: changed.baseUrl });
    expect(saved.providers[0]?.apiKey).toBeUndefined();
  });

  it("still rejects implicit environment credentials when a built-in provider changes origin", async () => {
    const path = await directory();
    vi.stubEnv("OPENAI_API_KEY", "synthetic-environment-key");
    const provider = draft({ id: "openai", baseUrl: "https://api.openai.com/v1" }); delete provider.apiKey;
    const { id, ...configured } = provider;
    await writeFile(join(path, "models.json"), JSON.stringify({ providers: { [id]: configured } }));
    const fetcher = vi.fn<typeof fetch>(() => Promise.reject(new Error("Unexpected network request")));
    const service = new ModelConfigurationService({ agentDir: path, fetch: fetcher });
    const changed = { ...provider, baseUrl: "https://another.example/v1" };
    await expect(service.discover(changed)).rejects.toThrow("origin changed");
    await expect(service.test(changed, "test-model")).rejects.toThrow("origin changed");
    await expect(service.write((await service.read()).revision, [changed])).rejects.toThrow("origin changed");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("tests an unsaved draft with bounded options without modifying configuration or credentials", async () => {
    const path = await directory(); const raw = JSON.stringify(fixture()); await writeFile(join(path, "models.json"), raw);
    const isolated = runtime();
    const service = new ModelConfigurationService({ agentDir: path, createRuntime: () => Promise.resolve(isolated) });
    expect(await service.test(draft(), "test-model")).toMatchObject({ ok: true, responseText: "OK" });
    const call = vi.mocked(isolated.completeSimple).mock.calls[0]; if (call === undefined) throw new Error("Missing model test call");
    expect(call[0]).toBe(model);
    expect(call[1].messages[0]).toMatchObject({ content: "Reply with OK only." });
    expect(call[2]).toMatchObject({ maxTokens: 16, maxRetries: 0, timeoutMs: 20000, cacheRetention: "none", transport: "sse" });
    expect(call[2]?.signal).toBeInstanceOf(AbortSignal);
    expect(await readFile(join(path, "models.json"), "utf8")).toBe(raw);
    await expect(readFile(join(path, "auth.json"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(boundedModelTestPayload({ max_tokens: 50000, generationConfig: { maxOutputTokens: 9000, other: true } })).toEqual({ max_tokens: 16, generationConfig: { maxOutputTokens: 16, other: true } });
  });

  it("uses the real SDK to reject incompatible model definitions before replacing the file", async () => {
    const path = await directory(); const service = new ModelConfigurationService({ agentDir: path });
    const before = await service.read();
    await expect(service.write(before.revision, [{ ...draft(), models: [{ id: "test-model", cost: { input: 1 } }] }])).rejects.toThrow();
    await expect(readFile(join(path, "models.json"))).rejects.toMatchObject({ code: "ENOENT" });
    const valid = await service.write(before.revision, [draft()]);
    expect(valid.providers[0]?.models[0]?.id).toBe("test-model");
  });

  it("reports a committed save separately from a failed runtime refresh", async () => {
    const path = await directory(); const service = new ModelConfigurationService({ agentDir: path, createRuntime: () => Promise.resolve(runtime()), onSaved: () => Promise.reject(new Error("refresh failed")) });
    const result = await service.write("missing", [draft()]);
    expect(result.refreshWarning).toBe(true);
    expect((await service.read()).providers).toEqual(result.providers);
  });

  it("runs a real SDK completion against an injected HTTP transport using the unsaved endpoint and key", async () => {
    const path = await directory();
    await writeFile(join(path, "auth.json"), JSON.stringify({ test: { type: "api_key", key: "stale-login-key" } }));
    const previous = fixture();
    modelConfigurationRecord(modelConfigurationRecord(previous["providers"])["test"])["baseUrl"] = "https://old.example/v1";
    const original = JSON.stringify(previous); await writeFile(join(path, "models.json"), original);
    const events = [
      { id: "probe", object: "chat.completion.chunk", created: 1, model: "test-model", choices: [{ index: 0, delta: { role: "assistant", content: "OK" }, finish_reason: null }] },
      { id: "probe", object: "chat.completion.chunk", created: 1, model: "test-model", choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } },
    ];
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(new Response(`${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`, { headers: { "content-type": "text/event-stream" } })));
    const service = new ModelConfigurationService({ agentDir: path, fetch: fetcher });
    expect(await service.test(draft({ headers: { "x-extra": "draft-header" } }), "test-model")).toMatchObject({ ok: true, responseText: "OK", status: 200 });
    expect(fetcher).toHaveBeenCalledOnce();
    const call = fetcher.mock.calls[0]; if (call === undefined) throw new Error("Missing SDK HTTP call");
    const url = typeof call[0] === "string" ? call[0] : call[0] instanceof URL ? call[0].href : call[0].url;
    expect(url).toBe("https://provider.example/v1/chat/completions");
    expect(new Headers(call[1]?.headers).get("authorization")).toBe("Bearer new-key");
    expect(new Headers(call[1]?.headers).get("x-extra")).toBe("draft-header");
    expect(call[1]?.redirect).toBe("error");
    expect(typeof call[1]?.body === "string" ? JSON.parse(call[1].body) : undefined).toMatchObject({ max_completion_tokens: 16 });
    expect(await readFile(join(path, "models.json"), "utf8")).toBe(original);
    expect(await readFile(join(path, "auth.json"), "utf8")).toContain("stale-login-key");
  });

  it("discovers with the real SDK's resolved draft credentials before any model has been added", async () => {
    const path = await directory();
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ data: [{ id: "discovered" }] })));
    const service = new ModelConfigurationService({ agentDir: path, fetch: fetcher });
    expect(await service.discover(draft({ models: [], headers: { "x-custom-auth": "draft-header" } }))).toEqual({ models: [{ id: "discovered" }], truncated: false });
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer new-key");
    expect(headers.get("x-custom-auth")).toBe("draft-header");
  });
});
