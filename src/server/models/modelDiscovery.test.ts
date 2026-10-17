import { describe, expect, it, vi } from "vitest";
import { discoveredModelsFromResponse, discoverProviderModels, modelDiscoveryUrl } from "./modelDiscovery.js";

describe("provider model discovery", () => {
  it("builds provider-specific list URLs and parses only unambiguous token limits", () => {
    expect(modelDiscoveryUrl("https://example.com/proxy/", "anthropic-messages").href).toBe("https://example.com/proxy/v1/models");
    expect(modelDiscoveryUrl("https://example.com/", "google-generative-ai").href).toBe("https://example.com/v1beta/models");
    expect(discoveredModelsFromResponse({ data: [{ id: "model-a", context_length: 5000, max_output_tokens: 300 }, { id: "model-a" }, { id: "model-b", max_tokens: 1234 }, { name: "models/model-c", displayName: "C", inputTokenLimit: 9000 }] })).toEqual({
      models: [{ id: "model-a", contextWindow: 5000, maxTokens: 300 }, { id: "model-b" }, { id: "model-c", name: "C", contextWindow: 9000 }], truncated: false,
    });
  });

  it("uses auth headers and disallows redirects without returning provider error bodies", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(new Response('{"error":"secret-provider-body"}', { status: 401 })));
    await expect(discoverProviderModels({ baseUrl: "https://example.com/v1", api: "anthropic-messages", apiKey: "new-key", headers: { "x-private": "private-header" }, signal: AbortSignal.timeout(2000), fetch: fetcher })).rejects.toThrow("HTTP 401");
    expect(fetcher).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ redirect: "error" }));
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(fetcher.mock.calls[0]?.[1]?.headers);
    expect(headers.get("x-api-key")).toBe("new-key");
    expect(headers.get("x-private")).toBe("private-header");
    expect(headers.get("anthropic-version")).toBe("2023-06-01");
  });

  it("bounds both response bytes and the returned catalog", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(new Response("{}", { headers: { "content-length": String(3 * 1024 * 1024) } })));
    await expect(discoverProviderModels({ baseUrl: "https://example.com", api: "openai-completions", apiKey: undefined, headers: undefined, signal: AbortSignal.timeout(2000), fetch: fetcher })).rejects.toThrow("size limit");
    const result = discoveredModelsFromResponse({ data: Array.from({ length: 1002 }, (_, index) => ({ id: `m-${String(index)}` })) });
    expect(result.models).toHaveLength(1000);
    expect(result.truncated).toBe(true);
  });
});
