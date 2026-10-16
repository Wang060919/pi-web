import { describe, expect, it } from "vitest";
import { workspaceFileCards } from "./workspaceFileCards";

const context = { machineId: "local", projectId: "p", workspaceId: "w", root: "/work" };

describe("workspace file cards", () => {
  it("uses explicit file links, decodes paths once and deduplicates their canonical identity", () => {
    expect(workspaceFileCards("[Report](./output/report%20one.md) and [again](/work/output/report%20one.md#section)\n\n[Source][src]\n\n[src]: src/app.ts", context)).toEqual([
      { path: "output/report one.md", name: "report one.md", extension: "MD" },
      { path: "src/app.ts", name: "app.ts", extension: "TS" },
    ]);
  });

  it("does not turn prose, code, images, external links or unsafe/outside paths into cards", () => {
    const text = 'Created report.md. `[…] (code.md)`\n\n```md\n[file](code.md)\n```\n\n![image](picture.png) [web](https://example.com/a.pdf) [outside](/elsewhere/a.md) [parent](../secret.txt) [encoded](%2e%2e/secret.txt) [folder](output/) [bad](bad%zz) [scheme](javascript:alert)';
    expect(workspaceFileCards(text, context)).toEqual([]);
    expect(workspaceFileCards("[file](report.md)", undefined)).toEqual([]);
  });

  it("supports extensionless files without inventing a file type or generation status", () => {
    expect(workspaceFileCards("[license](LICENSE)", context)).toEqual([{ path: "LICENSE", name: "LICENSE", extension: "" }]);
  });
});
