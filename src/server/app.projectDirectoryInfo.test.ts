import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProjectDirectoryInfo } from "../shared/apiTypes.js";
import { appTestContext, registerAppTestHooks } from "./app.testSupport.js";

registerAppTestHooks();
describe("read-only project directory status", () => {
  it.each(["/api", "/api/machines/local"])("describes an existing directory through %s", async (prefix) => {
    await mkdir(appTestContext.projectDir);
    const response = await appTestContext.app.inject({ method: "GET", url: `${prefix}/project-directory-info?q=${encodeURIComponent(appTestContext.projectDir)}` });
    expect(response.statusCode).toBe(200);
    expect(response.json<ProjectDirectoryInfo>()).toEqual({ path: appTestContext.projectDir, parentPath: dirname(appTestContext.projectDir), exists: true, isDirectory: true });
  });
  it("reports a missing path without creating it", async () => {
    const path = join(appTestContext.tempDir, "not-created");
    const response = await appTestContext.app.inject({ method: "GET", url: `/api/project-directory-info?q=${encodeURIComponent(path)}` });
    expect(response.json<ProjectDirectoryInfo>()).toMatchObject({ path, exists: false, isDirectory: false });
    await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("distinguishes files from directories", async () => {
    const path = join(appTestContext.tempDir, "file.txt"); await writeFile(path, "test");
    const response = await appTestContext.app.inject({ method: "GET", url: `/api/project-directory-info?q=${encodeURIComponent(path)}` });
    expect(response.json<ProjectDirectoryInfo>()).toMatchObject({ exists: true, isDirectory: false });
  });
  it("surfaces invalid path reads instead of reporting them as missing directories", async () => {
    // A file used as a parent yields ENOTDIR on POSIX but ENOENT on Windows.
    // NUL is rejected on both platforms and exercises the shared error contract.
    const path = join(appTestContext.tempDir, "invalid\0path");
    const invalid = await appTestContext.app.inject({ method: "GET", url: `/api/project-directory-info?q=${encodeURIComponent(path)}` });
    expect(invalid.statusCode).toBe(400);
  });
});
