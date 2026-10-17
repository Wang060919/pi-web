import { text as streamText } from "node:stream/consumers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteMachineClient } from "./machineClient.js";

afterEach(() => { vi.useRealTimers(); });

describe("RemoteMachineClient", () => {
  it("forwards raw binary request bodies with the provided content type", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response("ok", { status: 200 })));
    const client = new RemoteMachineClient({ baseUrl: "https://remote.example.test/" }, fetchImpl);
    const payload = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    await client.request("PUT", "/api/projects/p1/workspaces/w1/file?path=image.png", payload, { contentType: "image/png" });

    const { input, init } = onlyFetchCall(fetchImpl);
    expect(fetchInputUrl(input)).toBe("https://remote.example.test/api/projects/p1/workspaces/w1/file?path=image.png");
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("content-type")).toBe("image/png");
    if (!(init.body instanceof ArrayBuffer)) throw new Error("Expected binary request body");
    expect(Array.from(new Uint8Array(init.body))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("serializes structured request bodies as JSON by default", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response("ok", { status: 200 })));
    const client = new RemoteMachineClient({ baseUrl: "https://remote.example.test/base/", token: "secret" }, fetchImpl);

    await client.request("POST", "/api/sessions", { cwd: "/repo" });

    const { input, init } = onlyFetchCall(fetchImpl);
    expect(fetchInputUrl(input)).toBe("https://remote.example.test/base/api/sessions");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer secret");
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ cwd: "/repo" }));
  });

  it("propagates caller cancellation into the remote fetch", async () => {
    let fetchSignal: AbortSignal | null | undefined;
    const fetchImpl = vi.fn<typeof fetch>((_input, init) => {
      fetchSignal = init?.signal;
      return new Promise<Response>((_resolve, rejectPromise) => {
        init?.signal?.addEventListener("abort", () => {
          const reason: unknown = init.signal?.reason;
          rejectPromise(reason instanceof Error ? reason : new DOMException("Cancelled", "AbortError"));
        }, { once: true });
      });
    });
    const client = new RemoteMachineClient({ baseUrl: "https://remote.example.test/" }, fetchImpl);
    const controller = new AbortController();

    const pending = client.request("DELETE", "/api/projects/p1/workspaces/w1", { precondition: "v1.confirmed" }, {
      timeoutMs: 30_000,
      signal: controller.signal,
    });
    const expectation = expect(pending).rejects.toMatchObject({
      statusCode: 502,
      message: "Remote machine request cancelled",
    });
    controller.abort(new DOMException("Gateway request cancelled", "AbortError"));
    await expectation;

    expect(fetchSignal?.aborted).toBe(true);
  });

  it("requests compression for the remote hop even when configured headers use different casing", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response("ok", { status: 200 })));
    const client = new RemoteMachineClient({
      baseUrl: "https://remote.example.test/",
      headers: { "Accept-Encoding": "identity" },
    }, fetchImpl);

    await client.request("GET", "/api/projects");

    const { init } = onlyFetchCall(fetchImpl);
    expect(new Headers(init.headers).get("accept-encoding")).toBe("gzip, deflate");
  });

  it("removes stale representation headers after Fetch decodes a compressed response", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-encoding": "gzip",
        "content-length": "31",
      },
    })));
    const client = new RemoteMachineClient({ baseUrl: "https://remote.example.test/" }, fetchImpl);

    const response = await client.requestJson("GET", "/api/projects");

    expect(response.body).toEqual({ ok: true });
    expect(response.headers["content-type"]).toBe("application/json");
    expect(response.headers["content-encoding"]).toBeUndefined();
    expect(response.headers["content-length"]).toBeUndefined();
  });

  it("keeps the JSON deadline active while reading the response body", async () => {
    vi.useFakeTimers();
    const remote = remoteResponseBody();
    const client = new RemoteMachineClient({ baseUrl: "https://remote.example.test" }, remote.fetchImpl);
    const result = client.requestJson("GET", "/api/pi-web/status", undefined, { timeoutMs: 10 })
      .then((value) => ({ value }), (error: unknown) => ({ error }));
    await remote.bodyReading;

    await vi.advanceTimersByTimeAsync(10);
    if (remote.signal()?.aborted !== true) remote.finish("{}");

    expect(await result).toMatchObject({ error: { statusCode: 504, message: "Remote machine request timed out" } });
  });

  it("propagates caller cancellation after JSON response headers", async () => {
    const remote = remoteResponseBody();
    const parent = new AbortController();
    const client = new RemoteMachineClient({ baseUrl: "https://remote.example.test" }, remote.fetchImpl);
    const result = client.requestJson("GET", "/api/config", undefined, { signal: parent.signal })
      .then((value) => ({ value }), (error: unknown) => ({ error }));
    await remote.bodyReading;

    parent.abort();
    if (remote.signal()?.aborted !== true) remote.finish("{}");

    expect(await result).toMatchObject({ error: { statusCode: 502, message: "Remote machine request cancelled" } });
  });

  it("cleans up the JSON deadline and parent listener after completion", async () => {
    vi.useFakeTimers();
    const remote = remoteResponseBody();
    const parent = new AbortController();
    const client = new RemoteMachineClient({ baseUrl: "https://remote.example.test" }, remote.fetchImpl);
    const pending = client.requestJson("GET", "/api/config", undefined, { timeoutMs: 10, signal: parent.signal });
    await remote.bodyReading;
    remote.finish('{"ok":true}');

    expect((await pending).body).toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
    parent.abort();
    await vi.advanceTimersByTimeAsync(20);
    expect(remote.signal()?.aborted).toBe(false);
  });

  it("continues handing streaming response lifetime to the caller after headers", async () => {
    vi.useFakeTimers();
    const remote = remoteResponseBody();
    const client = new RemoteMachineClient({ baseUrl: "https://remote.example.test" }, remote.fetchImpl);
    const response = await client.request("GET", "/api/download", undefined, { timeoutMs: 10 });

    await vi.advanceTimersByTimeAsync(20);
    expect(remote.signal()?.aborted).toBe(false);
    remote.finish("streaming content");
    if (response.body === undefined) throw new Error("Expected response body");
    expect(await streamText(response.body)).toBe("streaming content");
  });
});

/** Fetch aborts an unread response body even after its headers have arrived. */
function remoteResponseBody() {
  let signal: AbortSignal | null | undefined;
  let body: ReadableStreamDefaultController<Uint8Array> | undefined;
  let reading = (): void => undefined;
  const bodyReading = new Promise<void>((resolve) => { reading = resolve; });
  const response = new Response(new ReadableStream<Uint8Array>({ start(controller) { body = controller; } }));
  const readText = response.text.bind(response);
  response.text = () => { reading(); return readText(); };
  const onAbort = (): void => { body?.error(signal?.reason); };
  const fetchImpl = vi.fn<typeof fetch>((_input, init) => {
    signal = init?.signal;
    if (signal?.aborted === true) onAbort();
    else signal?.addEventListener("abort", onAbort, { once: true });
    return Promise.resolve(response);
  });
  return {
    fetchImpl,
    bodyReading,
    signal: () => signal,
    finish(content: string): void {
      signal?.removeEventListener("abort", onAbort);
      body?.enqueue(new TextEncoder().encode(content));
      body?.close();
    },
  };
}

function fetchInputUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function onlyFetchCall(fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>): { input: RequestInfo | URL; init: RequestInit } {
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const call = fetchImpl.mock.calls[0];
  if (call === undefined) throw new Error("Expected fetch call");
  const [input, init] = call;
  if (init === undefined) throw new Error("Expected fetch init");
  return { input, init };
}
