// @vitest-environment happy-dom
import { LitElement } from "lit";
import { afterEach, expect, it, vi } from "vitest";
import { mountDevelopmentDemoLauncher, parseDevelopmentDemoSessions } from "./developmentDemo";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const example = { id: "welcome", name: "Welcome", url: "?project=demo&session=welcome" };

it("resolves sample links within the application and rejects destinations outside it", () => {
  const parse = (url: string) => parseDevelopmentDemoSessions({ sessions: [{ ...example, url }] }, "https://example.test/pi/");
  expect(parse(example.url)[0]?.url).toBe("https://example.test/pi/?project=demo&session=welcome");
  for (const url of ["https://outside.test/pi/", "/other/", "../", "https://user:secret@example.test/pi/", "javascript:alert(1)"]) {
    expect(() => parse(url)).toThrow();
  }
  expect(() => parseDevelopmentDemoSessions({ sessions: [] }, "https://example.test/pi/")).toThrow();
});

it.each(["http://127.0.0.1:8517/", "http://localhost:8515/pi/"])("keeps relative scenario links on the active preview origin and application path: %s", (base) => {
  const session = parseDevelopmentDemoSessions({ sessions: [example] }, base)[0];
  expect(session?.url).toBe(`${base}${example.url}`);
});

async function launcher() {
  mountDevelopmentDemoLauncher();
  const element = document.querySelector("development-demo-launcher");
  if (!(element instanceof LitElement)) throw new Error("Missing demo launcher");
  await element.updateComplete;
  return element;
}

it("loads examples only after the explicit action, then exposes navigable scenario links", async () => {
  vi.stubEnv("BASE_URL", "/");
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ sessions: [example] })));
  vi.stubGlobal("fetch", fetch);
  const element = await launcher();
  element.shadowRoot?.querySelector<HTMLButtonElement>(".launcher")?.click();
  await element.updateComplete;
  expect(fetch).not.toHaveBeenCalled();
  expect(element.shadowRoot?.querySelector("dialog")?.open).toBe(true);
  element.shadowRoot?.querySelector<HTMLButtonElement>(".primary")?.click();
  await vi.waitFor(() => { expect(element.shadowRoot?.querySelectorAll("nav a").length).toBe(1); });
  expect(fetch).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("/api/dev-demo"), expect.objectContaining({ method: "POST", body: "{}" }));
  expect(element.shadowRoot?.querySelector("nav a")?.textContent).toContain("Welcome");
  expect(element.shadowRoot?.querySelector("a.welcome")?.getAttribute("href")).toContain("?project=demo&session=welcome");
});

it("shows loader errors and lets the user retry", async () => {
  vi.stubEnv("BASE_URL", "/");
  vi.stubGlobal("fetch", vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(JSON.stringify({ error: "Unable to write demo data" }), { status: 500 })));
  const element = await launcher();
  element.shadowRoot?.querySelector<HTMLButtonElement>(".primary")?.click();
  await vi.waitFor(() => { expect(element.shadowRoot?.querySelector("[role=alert]")?.textContent).toContain("Unable to write demo data"); });
  expect(element.shadowRoot?.querySelector<HTMLButtonElement>(".primary")?.disabled).toBe(false);
});
