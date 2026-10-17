import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MachineStore } from "./machineStore.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename), writeFile: vi.fn(actual.writeFile) };
});

let directory: string;
let path: string;
let store: MachineStore;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "pi-web-machine-store-"));
  path = join(directory, "machines.json");
  store = new MachineStore(path);
});

afterEach(async () => {
  vi.mocked(rename).mockReset();
  vi.mocked(writeFile).mockReset();
  await rm(directory, { recursive: true, force: true });
});

describe("MachineStore durable mutations", () => {
  it.skipIf(process.platform === "win32")("updates the target of an existing relative symlink without replacing the link", async () => {
    const target = join(directory, "private", "registry.json");
    await mkdir(join(directory, "private"));
    await writeFile(target, '{"machines":[]}\n');
    await symlink("private/registry.json", path);

    const added = await store.add({ name: "linked", baseUrl: "https://example.test", token: "private-secret" });
    await store.update(added.id, { name: "updated" });

    expect((await lstat(path)).isSymbolicLink()).toBe(true);
    expect(JSON.parse(await readFile(target, "utf8"))).toMatchObject({ machines: [{ id: added.id, name: "updated", token: "private-secret" }] });
    expect((await stat(target)).mode & 0o777).toBe(0o600);
    expect(await store.list()).toEqual([expect.objectContaining({ id: added.id, name: "updated" })]);
    await store.remove(added.id);
    expect(JSON.parse(await readFile(target, "utf8"))).toEqual({ machines: [] });
    expect((await lstat(path)).isSymbolicLink()).toBe(true);
  });

  it.skipIf(process.platform === "win32")("creates a dangling symlink's target when its parent exists", async () => {
    const target = join(directory, "private", "new.json");
    await mkdir(join(directory, "private"));
    await symlink("private/new.json", path);

    const added = await store.add({ name: "linked", baseUrl: "https://example.test" });

    expect((await lstat(path)).isSymbolicLink()).toBe(true);
    expect(JSON.parse(await readFile(target, "utf8"))).toMatchObject({ machines: [{ id: added.id }] });
    expect((await stat(target)).mode & 0o777).toBe(0o600);
  });

  it.skipIf(process.platform === "win32")("stages beside a symlink target and preserves the link and target on replacement failure", async () => {
    const targetDirectory = join(directory, "private");
    const target = join(targetDirectory, "registry.json");
    await mkdir(targetDirectory);
    const before = '{"machines":[]}\n';
    await writeFile(target, before);
    await symlink(target, path);
    const failure = Object.assign(new Error("cannot replace target"), { code: "EACCES" });
    vi.mocked(rename).mockImplementationOnce(async (source, destination) => {
      expect(dirname(String(source))).toBe(targetDirectory);
      expect(destination).toBe(target);
      expect((await stat(source)).mode & 0o777).toBe(0o600);
      throw failure;
    });

    await expect(store.add({ name: "failed", baseUrl: "https://example.test" })).rejects.toBe(failure);
    expect((await lstat(path)).isSymbolicLink()).toBe(true);
    expect(await readFile(target, "utf8")).toBe(before);
    expect(await readdir(targetDirectory)).toEqual(["registry.json"]);
    await store.add({ name: "retry", baseUrl: "https://example.test" });
    expect((await store.list()).map((machine) => machine.name)).toEqual(["retry"]);
  });

  it("retains every concurrent addition", async () => {
    const added = await Promise.all(Array.from({ length: 10 }, (_, index) => store.add({ name: `machine-${String(index)}`, baseUrl: "https://example.test" })));

    expect((await store.list()).map((machine) => machine.id)).toEqual(added.map((machine) => machine.id));
  });

  it("serializes updates, addition, removal and an admitted list without dropping fields", async () => {
    const first = await store.add({ name: "first", baseUrl: "https://example.test" });
    const second = await store.add({ name: "second", baseUrl: "https://example.test" });
    const [, , third, , listed] = await Promise.all([
      store.update(first.id, { name: "renamed" }),
      store.update(first.id, { token: "updated-secret" }),
      store.add({ name: "third", baseUrl: "https://example.test" }),
      store.remove(second.id),
      store.list(),
    ]);

    expect(listed).toEqual([
      expect.objectContaining({ id: first.id, name: "renamed", token: "updated-secret" }),
      third,
    ]);
    expect(await store.list()).toEqual(listed);
  });

  it("keeps the previous registry when the new snapshot fails partway through writing", async () => {
    await store.add({ name: "original", baseUrl: "https://example.test" });
    const before = await readFile(path, "utf8");
    const failure = Object.assign(new Error("disk full"), { code: "ENOSPC" });
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(writeFile).mockImplementationOnce(async (file, _data, options) => {
      await actual.writeFile(file, "partial", options);
      throw failure;
    });

    await expect(store.add({ name: "failed", baseUrl: "https://example.test" })).rejects.toBe(failure);
    expect(await readFile(path, "utf8")).toBe(before);
    expect(await readdir(directory)).toEqual(["machines.json"]);
    await store.add({ name: "retry", baseUrl: "https://example.test" });
    expect((await store.list()).map((machine) => machine.name)).toEqual(["original", "retry"]);
  });

  it("keeps readers on the previous snapshot until atomic replacement succeeds", async () => {
    await store.add({ name: "original", baseUrl: "https://example.test" });
    const before = await readFile(path, "utf8");
    const failure = Object.assign(new Error("cannot replace"), { code: "EACCES" });
    vi.mocked(rename).mockImplementationOnce(async () => {
      expect(await readFile(path, "utf8")).toBe(before);
      throw failure;
    });

    await expect(store.add({ name: "failed", baseUrl: "https://example.test" })).rejects.toBe(failure);
    expect(await readFile(path, "utf8")).toBe(before);
    expect(await readdir(directory)).toEqual(["machines.json"]);
    expect((await store.list()).map((machine) => machine.name)).toEqual(["original"]);
  });

  it.skipIf(process.platform === "win32")("keeps the staging snapshot and final registry owner-only", async () => {
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    const stagedModes: number[] = [];
    vi.mocked(rename).mockImplementationOnce(async (source, destination) => {
      stagedModes.push((await stat(source)).mode & 0o777);
      await actual.rename(source, destination);
    });

    await store.add({ name: "private", baseUrl: "https://example.test", token: "private-secret" });
    expect(stagedModes).toEqual([0o600]);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });
});
