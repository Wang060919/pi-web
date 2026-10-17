import { lstat, mkdir, readFile, readlink, rename, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { moveWorkspaceFile, readWorkspaceFile } from "./fileContentService.js";
import { cleanupTempWorkspaces, createTempWorkspace } from "./fileContentService.testSupport.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename), unlink: vi.fn(actual.unlink) };
});

afterEach(async () => {
  vi.mocked(rename).mockReset();
  vi.mocked(unlink).mockReset();
  await cleanupTempWorkspaces();
});

describe("moveWorkspaceFile", () => {
  it("moves a file to a new path", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "original.txt"), "content");

    const result = await moveWorkspaceFile(root, "original.txt", "moved.txt");

    expect(result).toMatchObject({ fromPath: "original.txt", toPath: "moved.txt" });
    expect(result.size).toBe(7);
    expect(Date.parse(result.modifiedAt)).not.toBeNaN();
    // Source should no longer exist
    await expect(readWorkspaceFile(root, "original.txt")).rejects.toThrow("Path does not exist");
    // Target should exist
    const target = await readWorkspaceFile(root, "moved.txt");
    expect(target.content).toBe("content");
  });

  it("creates intermediate directories by default", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "file.txt"), "data");

    await moveWorkspaceFile(root, "file.txt", "deep/nested/dir/file.txt");

    const target = await readWorkspaceFile(root, "deep/nested/dir/file.txt");
    expect(target.content).toBe("data");
  });

  it("fails when createDirs is false and parent directory does not exist", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "file.txt"), "data");

    await expect(moveWorkspaceFile(root, "file.txt", "missing/dir/file.txt", { createDirs: false })).rejects.toThrow();
    const source = await readWorkspaceFile(root, "file.txt");
    expect(source.content).toBe("data");
  });

  it("overwrites target when overwrite is true", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "source.txt"), "source content");
    await writeFile(join(root, "target.txt"), "target content");

    const result = await moveWorkspaceFile(root, "source.txt", "target.txt", { overwrite: true });

    expect(result.toPath).toBe("target.txt");
    const target = await readWorkspaceFile(root, "target.txt");
    expect(target.content).toBe("source content");
  });

  it("throws when target exists and overwrite is false (default)", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "source.txt"), "source");
    await writeFile(join(root, "target.txt"), "target");

    await expect(moveWorkspaceFile(root, "source.txt", "target.txt")).rejects.toThrow("File already exists");
    // Source and target should remain unchanged
    const source = await readWorkspaceFile(root, "source.txt");
    expect(source.content).toBe("source");
    const target = await readWorkspaceFile(root, "target.txt");
    expect(target.content).toBe("target");
  });

  it("preserves both contents when concurrent moves target the same absent path", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "a.txt"), "A");
    await writeFile(join(root, "b.txt"), "B");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    let arrivals = 0;
    let release = (): void => undefined;
    const bothReady = new Promise<void>((resolve) => { release = resolve; });
    // Hold the old check-then-rename implementation until both checks passed.
    // Atomic no-replace moves need no barrier and never call this replacement.
    vi.mocked(rename).mockImplementation(async (source, destination) => {
      arrivals += 1;
      if (arrivals === 2) release();
      await bothReady;
      await actual.rename(source, destination);
    });

    const results = await Promise.allSettled([
      moveWorkspaceFile(root, "a.txt", "target.txt"),
      moveWorkspaceFile(root, "b.txt", "target.txt"),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const winner = results[0].status === "fulfilled" ? "a.txt" : "b.txt";
    const loser = winner === "a.txt" ? "b.txt" : "a.txt";
    await expect(readFile(join(root, "target.txt"), "utf8")).resolves.toBe(winner === "a.txt" ? "A" : "B");
    await expect(readFile(join(root, loser), "utf8")).resolves.toBe(loser === "a.txt" ? "A" : "B");
    await expect(lstat(join(root, winner))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([true, false])("moves an internal symbolic link without moving its target (overwrite=%s)", async (overwrite) => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "real.txt"), "original");
    await symlink("real.txt", join(root, "alias.txt"));
    if (overwrite) await writeFile(join(root, "moved.txt"), "replace me");

    await moveWorkspaceFile(root, "alias.txt", "moved.txt", { overwrite });

    await expect(readFile(join(root, "real.txt"), "utf8")).resolves.toBe("original");
    expect((await lstat(join(root, "moved.txt"))).isSymbolicLink()).toBe(true);
    await expect(readlink(join(root, "moved.txt"))).resolves.toBe("real.txt");
    await expect(lstat(join(root, "alias.txt"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("does not replace an existing dangling destination link", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "source.txt"), "original");
    await symlink("missing.txt", join(root, "target.txt"));

    await expect(moveWorkspaceFile(root, "source.txt", "target.txt")).rejects.toThrow("File already exists");

    await expect(readFile(join(root, "source.txt"), "utf8")).resolves.toBe("original");
    await expect(readlink(join(root, "target.txt"))).resolves.toBe("missing.txt");
  });

  it("keeps content recoverable and reports when source removal fails", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "source.txt"), "original");
    vi.mocked(unlink).mockRejectedValueOnce(new Error("Source is locked"));

    await expect(moveWorkspaceFile(root, "source.txt", "target.txt")).rejects.toThrow("Destination created, but source could not be removed");

    await expect(readFile(join(root, "source.txt"), "utf8")).resolves.toBe("original");
    await expect(readFile(join(root, "target.txt"), "utf8")).resolves.toBe("original");
  });

  it.each([true, false])("preserves relative link text when moving across directories (overwrite=%s)", async (overwrite) => {
    const root = await createTempWorkspace();
    await mkdir(join(root, "sub"));
    await writeFile(join(root, "real.txt"), "original");
    await symlink("real.txt", join(root, "alias.txt"));

    await moveWorkspaceFile(root, "alias.txt", "sub/alias.txt", { overwrite });

    await expect(readFile(join(root, "real.txt"), "utf8")).resolves.toBe("original");
    await expect(readlink(join(root, "sub/alias.txt"))).resolves.toBe("real.txt");
    await expect(lstat(join(root, "alias.txt"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects source path traversal", async () => {
    const root = await createTempWorkspace();

    await expect(moveWorkspaceFile(root, "../secret.txt", "target.txt")).rejects.toThrow("Path traversal is not allowed");
  });

  it("rejects target path traversal", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "source.txt"), "data");

    await expect(moveWorkspaceFile(root, "source.txt", "../secret.txt")).rejects.toThrow("Path traversal is not allowed");
    const source = await readWorkspaceFile(root, "source.txt");
    expect(source.content).toBe("data");
  });

  it("rejects moving a directory", async () => {
    const root = await createTempWorkspace();
    await mkdir(join(root, "mydir"), { recursive: true });

    await expect(moveWorkspaceFile(root, "mydir", "newdir")).rejects.toThrow("Source path is not a file");
  });

  it("rejects missing fromPath or toPath", async () => {
    const root = await createTempWorkspace();

    await expect(moveWorkspaceFile(root, undefined, "target.txt")).rejects.toThrow("fromPath query parameter is required");
    await expect(moveWorkspaceFile(root, "source.txt", undefined)).rejects.toThrow("toPath query parameter is required");
    await expect(moveWorkspaceFile(root, "", "target.txt")).rejects.toThrow("fromPath query parameter is required");
    await expect(moveWorkspaceFile(root, "source.txt", "")).rejects.toThrow("toPath query parameter is required");
  });

  it("prevents moving through symlinks that escape the workspace", async () => {
    const root = await createTempWorkspace();
    await mkdir(join(root, "subdir"), { recursive: true });
    await writeFile(join(root, "subdir", "file.txt"), "data");
    // Create a symlink inside the workspace that points outside
    const outsideDir = await createTempWorkspace("pi-web-move-outside-");
    await symlink(outsideDir, join(root, "subdir", "escape"), "junction");

    await expect(moveWorkspaceFile(root, "subdir/file.txt", "subdir/escape/evil.txt")).rejects.toThrow("Path escapes workspace");
    const source = await readWorkspaceFile(root, "subdir/file.txt");
    expect(source.content).toBe("data");
    await expect(readFile(join(outsideDir, "evil.txt"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects an escaping destination before creating nested directories", async () => {
    const root = await createTempWorkspace();
    const outside = await createTempWorkspace("pi-web-move-mkdir-outside-");
    await writeFile(join(root, "source.txt"), "original");
    await symlink(outside, join(root, "escape"), "junction");

    await expect(moveWorkspaceFile(root, "source.txt", "escape/new/nested/target.txt")).rejects.toThrow("Path escapes workspace");

    await expect(stat(join(outside, "new"))).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(join(root, "source.txt"), "utf8")).resolves.toBe("original");
  });

  it("prevents moving a source symlink that escapes the workspace", async () => {
    const root = await createTempWorkspace();
    const outsideDir = await createTempWorkspace("pi-web-move-source-outside-");
    await writeFile(join(outsideDir, "secret.txt"), "secret");
    await symlink(join(outsideDir, "secret.txt"), join(root, "source-link.txt"));

    await expect(moveWorkspaceFile(root, "source-link.txt", "moved.txt")).rejects.toThrow("Path escapes workspace");
    await expect(readWorkspaceFile(root, "moved.txt")).rejects.toThrow("Path does not exist");
    await expect(readFile(join(outsideDir, "secret.txt"), "utf8")).resolves.toBe("secret");
  });
});
