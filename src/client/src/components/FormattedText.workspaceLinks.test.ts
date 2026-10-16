// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { FormattedText } from "./FormattedText";

afterEach(() => { document.body.replaceChildren(); localStorage.clear(); });

function dispatchClick(view: FormattedText, anchor: HTMLAnchorElement, options: MouseEventInit = {}): boolean {
  let intercepted = false;
  // Observe the component's decision, then suppress the DOM harness's native navigation.
  view.addEventListener("click", (event) => {
    intercepted = event.defaultPrevented;
    event.preventDefault();
  }, { once: true });
  anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, ...options }));
  return intercepted;
}

async function setup(destination = "report.txt") {
  const view = new FormattedText();
  view.workspaceContext = { machineId: "remote", projectId: "p", workspaceId: "w", root: "/work" };
  view.text = `[**file**](${destination})`;
  document.body.append(view);
  await view.updateComplete;
  const anchor = view.renderRoot.querySelector("a");
  if (!anchor) throw new Error("Missing link");
  return { view, anchor };
}

it("opens recognized files through a cancelable host request, retaining the download href", async () => {
  const { view, anchor } = await setup();
  const listener = vi.fn((event: Event) => { event.preventDefault(); });
  document.body.addEventListener("workspace-file-open", listener, { once: true });
  const click = new MouseEvent("click", { bubbles: true, composed: true, cancelable: true });
  const label = anchor.querySelector("strong");
  if (label === null) throw new Error("Missing link label");
  label.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(listener).toHaveBeenCalledOnce();
  expect(listener.mock.calls[0]?.[0]).toMatchObject({ detail: { ...view.workspaceContext, path: "report.txt" } });
  expect(anchor.href).toContain("download=1");
});

it.each(["./src/client/src/formatting/markdown.ts", "././src//client/./src/formatting/markdown.ts"])("opens %s with the server's canonical content identity", async (destination) => {
  const { view, anchor } = await setup(destination);
  const listener = vi.fn((event: Event) => { event.preventDefault(); });
  view.addEventListener("workspace-file-open", listener);
  expect(dispatchClick(view, anchor)).toBe(true);
  const path = "src/client/src/formatting/markdown.ts";
  expect(listener).toHaveBeenCalledOnce();
  expect(listener.mock.calls[0]?.[0]).toMatchObject({ detail: { ...view.workspaceContext, path } });
  expect(new URL(anchor.href).searchParams.get("path")).toBe(path);
});

it("leaves the native download when no host accepts the request", async () => {
  const { view, anchor } = await setup();
  expect(dispatchClick(view, anchor)).toBe(false);
});

it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])("leaves modified clicks native: %j", async (options) => {
  const { view, anchor } = await setup();
  const listener = vi.fn();
  view.addEventListener("workspace-file-open", listener);
  expect(dispatchClick(view, anchor, options)).toBe(false);
  expect(listener).not.toHaveBeenCalled();
});

it("leaves explicit new-tab links native", async () => {
  const { view, anchor } = await setup();
  anchor.target = "_blank";
  const listener = vi.fn();
  view.addEventListener("workspace-file-open", listener);
  expect(dispatchClick(view, anchor)).toBe(false);
  expect(listener).not.toHaveBeenCalled();
});

it("offers explicit assistant file references as cards through the existing preview event", async () => {
  const { view } = await setup("output/report%20one.md");
  expect(view.renderRoot.querySelector(".file-cards")).toBeNull();
  view.fileCards = true;
  await view.updateComplete;
  const card = view.renderRoot.querySelector<HTMLAnchorElement>(".file-card");
  if (card === null) throw new Error("File card missing");
  expect(card.textContent).toContain("report one.md");
  expect(card.textContent).toContain("MD");
  expect(new URL(card.href).searchParams.get("path")).toBe("output/report one.md");
  const open = vi.fn((event: Event) => { event.preventDefault(); });
  view.addEventListener("workspace-file-open", open);
  expect(dispatchClick(view, card)).toBe(true);
  expect(open.mock.calls[0]?.[0]).toMatchObject({ detail: { ...view.workspaceContext, path: "output/report one.md" } });

  view.workspaceContext = undefined;
  await view.updateComplete;
  expect(view.renderRoot.querySelector(".file-cards")).toBeNull();
});

it("keeps a card's download fallback and modified clicks native", async () => {
  const { view } = await setup();
  view.fileCards = true;
  await view.updateComplete;
  const card = view.renderRoot.querySelector<HTMLAnchorElement>(".file-card");
  if (card === null) throw new Error("File card missing");
  expect(dispatchClick(view, card)).toBe(false);
  expect(card.href).toContain("download=1");
  const open = vi.fn();
  view.addEventListener("workspace-file-open", open);
  expect(dispatchClick(view, card, { ctrlKey: true })).toBe(false);
  expect(open).not.toHaveBeenCalled();
});
