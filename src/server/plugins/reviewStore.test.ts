import { mkdir, mkdtemp, open, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { ReviewStore, reviewScope } from "../../../examples/session-bridge-plugin/src/store.js";
import type { Review } from "../../../examples/session-bridge-plugin/src/browser/protocol.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, mkdir: vi.fn(actual.mkdir), open: vi.fn(actual.open), rename: vi.fn(actual.rename) };
});

const roots: string[] = [];
const scope = reviewScope("project", "workspace");
const original: Review = { id: "11111111-1111-4111-8111-111111111111", createdAt: "2026-10-19", sessionId: "session", status: "running", text: "Running" };

afterEach(async () => {
  vi.mocked(mkdir).mockReset();
  vi.mocked(open).mockReset();
  vi.mocked(rename).mockReset();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "pi-review-store-"));
  roots.push(root);
  const store = new ReviewStore(root);
  await store.save(scope, original);
  return { root, store };
}

it.each(["read", "list"] as const)("waits for an active %s handle to close before replacing a review", async (operation) => {
  const { store } = await fixture();
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  let release: () => void = () => { throw new Error("Read gate not initialized"); };
  const held = new Promise<void>((resolve) => { release = resolve; });
  let started: () => void = () => { throw new Error("Read signal not initialized"); };
  const reading = new Promise<void>((resolve) => { started = resolve; });
  let readerOpen = false;
  vi.mocked(open).mockImplementationOnce(async (path, flags, mode) => {
    const handle = await actual.open(path, flags, mode);
    readerOpen = true;
    const readFile = handle.readFile.bind(handle);
    const close = handle.close.bind(handle);
    vi.spyOn(handle, "readFile").mockImplementation(async () => { started(); await held; return readFile("utf8"); });
    vi.spyOn(handle, "close").mockImplementation(async () => { await close(); readerOpen = false; });
    return handle;
  });
  vi.mocked(rename).mockImplementation((source, destination) => {
    if (readerOpen) return Promise.reject(Object.assign(new Error("Reader still holds destination"), { code: "EPERM" }));
    return actual.rename(source, destination);
  });
  const read = operation === "read" ? store.read(scope, original.id) : store.list(scope);
  await reading;
  vi.mocked(mkdir).mockClear();
  const updated: Review = { ...original, status: "failed", text: "synthetic provider failure" };
  const save = store.save(scope, updated);
  try {
    // save() must not even enter its filesystem work while the reader is held.
    await Promise.resolve();
    expect(mkdir).not.toHaveBeenCalled();
  } finally { release(); await Promise.all([read, save]); }
  expect(await read).toEqual(operation === "read" ? original : [original]);
  expect(await store.read(scope, original.id)).toEqual(updated);
});

it("propagates a failed replacement without poisoning later reads or writes", async () => {
  const { root, store } = await fixture();
  const error = Object.assign(new Error("persistent permission failure"), { code: "EPERM" });
  vi.mocked(rename).mockRejectedValueOnce(error);
  await expect(store.save(scope, { ...original, status: "failed", text: "unsaved" })).rejects.toBe(error);
  expect(await store.read(scope, original.id)).toEqual(original);
  expect(await readdir(join(root, scope))).toEqual([`${original.id}.json`]);
  const updated: Review = { ...original, status: "completed", text: "Saved later" };
  await store.save(scope, updated);
  expect(await store.read(scope, original.id)).toEqual(updated);
});
