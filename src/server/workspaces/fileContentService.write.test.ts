import { mkdir, open, readFile, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeWorkspaceFile } from "./fileContentService.js";
import { cleanupTempWorkspaces, createTempWorkspace } from "./fileContentService.testSupport.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open) };
});

afterEach(async () => {
  vi.mocked(open).mockReset();
  await cleanupTempWorkspaces();
});

describe("writeWorkspaceFile", () => {
  it("writes text content to a new file with normalized paths", async () => {
    const root = await createTempWorkspace();

    const result = await writeWorkspaceFile(root, "./src//hello.ts", Buffer.from("const greeting = 'hello';\n"));

    expect(result).toMatchObject({ path: "src/hello.ts", created: true });
    expect(result.size).toBe(26);
    expect(Date.parse(result.modifiedAt)).not.toBeNaN();

    // Verify the file was actually written
    const content = await readFile(join(root, "src", "hello.ts"), "utf8");
    expect(content).toBe("const greeting = 'hello';\n");
  });

  it("writes binary content without text re-encoding", async () => {
    const root = await createTempWorkspace();
    const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

    const result = await writeWorkspaceFile(root, "image.png", binaryData);

    expect(result).toMatchObject({ path: "image.png", created: true, size: 6 });
    await expect(readFile(join(root, "image.png"))).resolves.toEqual(binaryData);
  });

  it("overwrites existing files by default", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "notes.txt"), "old content");

    const result = await writeWorkspaceFile(root, "notes.txt", Buffer.from("new content"));

    expect(result).toMatchObject({ path: "notes.txt", created: false, size: 11 });
    const content = await readFile(join(root, "notes.txt"), "utf8");
    expect(content).toBe("new content");
  });

  it("throws when overwrite is false and file exists", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "existing.txt"), "data");

    await expect(writeWorkspaceFile(root, "existing.txt", Buffer.from("new"), { overwrite: false })).rejects.toThrow("File already exists");
  });

  it("creates intermediate directories by default", async () => {
    const root = await createTempWorkspace();

    await writeWorkspaceFile(root, "deep/nested/dir/file.txt", Buffer.from("deep content"));

    const content = await readFile(join(root, "deep", "nested", "dir", "file.txt"), "utf8");
    expect(content).toBe("deep content");
  });

  it("fails when createDirs is false and parent directory does not exist", async () => {
    const root = await createTempWorkspace();

    await expect(writeWorkspaceFile(root, "missing/dir/file.txt", Buffer.from("x"), { createDirs: false })).rejects.toThrow();
  });

  it("rejects missing paths, traversal, and absolute paths", async () => {
    const root = await createTempWorkspace();

    await expect(writeWorkspaceFile(root, undefined, Buffer.from("x"))).rejects.toThrow("path query parameter is required");
    await expect(writeWorkspaceFile(root, "../secret.txt", Buffer.from("x"))).rejects.toThrow("Path traversal is not allowed");
    await expect(writeWorkspaceFile(root, "/etc/passwd", Buffer.from("x"))).rejects.toThrow("Absolute paths are not allowed");
  });

  it("rejects writing to a directory path", async () => {
    const root = await createTempWorkspace();
    await mkdir(join(root, "mydir"), { recursive: true });

    await expect(writeWorkspaceFile(root, "mydir", Buffer.from("data"))).rejects.toThrow("Path is not a file");
  });

  it("prevents writing through symlinks that escape the workspace", async () => {
    const root = await createTempWorkspace();
    await mkdir(join(root, "subdir"), { recursive: true });
    const outsideDir = await createTempWorkspace("pi-web-outside-");
    await symlink(outsideDir, join(root, "subdir", "escape"), "junction");

    await expect(writeWorkspaceFile(root, "subdir/escape/evil.txt", Buffer.from("evil"))).rejects.toThrow("Path escapes workspace");
    await expect(readFile(join(outsideDir, "evil.txt"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([true, false])("rejects a dangling final symlink without creating its outside target (overwrite=%s)", async (overwrite) => {
    const root = await createTempWorkspace();
    const outsideDir = await createTempWorkspace("pi-web-dangling-outside-");
    const outside = join(outsideDir, "new.txt");
    await symlink(outside, join(root, "link.txt"));

    await expect(writeWorkspaceFile(root, "link.txt", Buffer.from("unsafe"), { overwrite })).rejects.toThrow();
    await expect(stat(outside)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([true, false])("does not truncate a replaced final symlink (native no-follow=%s)", async (noFollow) => {
    const root = await createTempWorkspace();
    const outsideDir = await createTempWorkspace("pi-web-write-race-outside-");
    const target = join(root, "file.txt");
    const outside = join(outsideDir, "secret.txt");
    await writeFile(target, "original");
    await writeFile(outside, "secret");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(open).mockImplementationOnce(async (path, flags, mode) => {
      await unlink(target);
      await symlink(outside, target);
      return actual.open(path, noFollow ? flags : "r+", mode);
    });

    await expect(writeWorkspaceFile(root, "file.txt", Buffer.from("unsafe"))).rejects.toThrow();
    await expect(readFile(outside, "utf8")).resolves.toBe("secret");
  });

  it("preserves a file created concurrently when overwrite is false", async () => {
    const root = await createTempWorkspace();
    const target = join(root, "new.txt");
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(open).mockImplementationOnce(async (path, flags, mode) => {
      await writeFile(target, "concurrent");
      return actual.open(path, flags, mode);
    });

    await expect(writeWorkspaceFile(root, "new.txt", Buffer.from("unsafe"), { overwrite: false })).rejects.toThrow();
    await expect(readFile(target, "utf8")).resolves.toBe("concurrent");
  });

  it("keeps supported writes through a symlink to a file inside the workspace", async () => {
    const root = await createTempWorkspace();
    await writeFile(join(root, "target.txt"), "original");
    await symlink(join(root, "target.txt"), join(root, "link.txt"));

    await expect(writeWorkspaceFile(root, "link.txt", Buffer.from("updated"))).resolves.toMatchObject({ created: false });
    await expect(readFile(join(root, "target.txt"), "utf8")).resolves.toBe("updated");
  });

  it("rejects an escaping parent before creating nested directories", async () => {
    const root = await createTempWorkspace();
    const outsideDir = await createTempWorkspace("pi-web-mkdir-outside-");
    await symlink(outsideDir, join(root, "escape"), "junction");

    await expect(writeWorkspaceFile(root, "escape/new/file.txt", Buffer.from("unsafe"))).rejects.toThrow("Path escapes workspace");
    await expect(stat(join(outsideDir, "new"))).rejects.toMatchObject({ code: "ENOENT" });
  });
});
