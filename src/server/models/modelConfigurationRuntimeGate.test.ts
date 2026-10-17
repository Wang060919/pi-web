import { describe, expect, it } from "vitest";
import { ModelConfigurationRuntimeGate } from "./modelConfigurationRuntimeGate.js";

function config(provider: Record<string, unknown> = {}): Record<string, unknown> {
  return { providers: { custom: { api: "openai-completions", baseUrl: "https://old.example/v1", apiKey: "old-key", models: [{ id: "model", name: "Original" }], ...provider } } };
}

describe("model configuration runtime gate", () => {
  it("allows initial configuration but retains the construction latch after failed or closed sessions", () => {
    const gate = new ModelConfigurationRuntimeGate(() => ["openai", "extension"]);
    gate.assertTransition(config(), config({ apiKey: "initial-key" }));
    gate.beforeRuntimeConstruction();
    for (const change of [{ apiKey: "new-key" }, { baseUrl: "https://new.example/v1" }, { headers: { authorization: "new-key" } }, { api: "openai-responses" }, { models: [] }, { models: [{ id: "model", baseUrl: "https://model.example/v1" }] }, { modelOverrides: { builtin: { headers: { authorization: "new-key" } } } }]) {
      expect(() => { gate.assertTransition(config(), config(change)); }).toThrow("Existing provider connections cannot change");
    }
    expect(() => { gate.assertTransition(config(), { providers: {} }); }).toThrow("Existing provider connections cannot change");
    expect(() => { gate.assertTransition({ providers: { custom: { models: [], modelOverrides: { builtin: { baseUrl: "https://old.example/v1" } } } } }, { providers: { custom: { models: [] } } }); }).toThrow("Existing provider connections cannot change");
    expect(() => { gate.assertTransition(config(), config({ models: [{ id: "model", name: "Updated", contextWindow: 8192, maxTokens: 256, cost: { input: 1 }, reasoning: true, input: ["text"] }, { id: "extra" }] })); }).not.toThrow();
  });

  it("permits genuinely new IDs but blocks builtin, extension and previously saved provider identities", () => {
    const gate = new ModelConfigurationRuntimeGate(() => ["openai", "extension"]);
    gate.beforeRuntimeConstruction();
    for (const id of ["openai", "extension"]) expect(() => { gate.assertTransition({}, { providers: { [id]: { baseUrl: "https://new.example/v1", apiKey: "new-key" } } }); }).toThrow("Existing provider connections cannot change");
    const added = { providers: { fresh: { baseUrl: "https://fresh.example/v1", apiKey: "new-key" } } };
    expect(() => { gate.assertTransition({}, added); }).not.toThrow();
    gate.saved(added);
    expect(() => { gate.assertTransition(added, { providers: { fresh: { baseUrl: "https://changed.example/v1", apiKey: "new-key" } } }); }).toThrow();
    expect(() => { gate.assertTransition(added, { providers: { renamed: { baseUrl: "https://fresh.example/v1", apiKey: "new-key" } } }); }).toThrow();
  });

  it("blocks admission synchronously throughout saving and releases on operation or provider-list errors", async () => {
    const gate = new ModelConfigurationRuntimeGate(() => []);
    let release = () => { /* assigned by the synchronous promise executor */ };
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const save = gate.save(() => pending);
    expect(() => { gate.beforeRuntimeConstruction(); }).toThrow("being saved");
    await expect(gate.save(() => Promise.resolve())).rejects.toThrow("Another model configuration save");
    release(); await save;
    expect(() => { gate.beforeRuntimeConstruction(); }).not.toThrow();
    await expect(gate.save(() => Promise.reject(new Error("write failed")))).rejects.toThrow("write failed");
    expect(() => { gate.beforeRuntimeConstruction(); }).not.toThrow();

    let broken = false;
    const failing = new ModelConfigurationRuntimeGate(() => { if (broken) throw new Error("provider list failed"); return []; });
    broken = true;
    await expect(failing.save(() => Promise.resolve())).rejects.toThrow("provider list failed");
    broken = false;
    expect(() => { failing.beforeRuntimeConstruction(); }).not.toThrow();
  });
});
