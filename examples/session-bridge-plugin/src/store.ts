import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { isReview, type Review } from "./browser/protocol.js";

/** Only host-resolved ids enter the scope hash; peer input is never a filesystem path. */
export function reviewScope(projectId: string, workspaceId: string): string {
  return createHash("sha256").update(JSON.stringify([projectId, workspaceId])).digest("hex");
}

export class ReviewStore {
  private pending: Promise<void> = Promise.resolve();

  // One activation owns this store. Do not let its polling readers retain a
  // destination handle during atomic replacement (Windows rejects that rename).
  // This coordinates this instance only, not external processes or stores.
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pending.then(operation);
    this.pending = result.then(() => undefined, () => undefined);
    return result;
  }

  constructor(private readonly dataDirectory: string) {}

  private async directory(scope: string): Promise<string> {
    if (!/^[a-f0-9]{64}$/.test(scope)) throw new Error("Invalid review scope");
    const directory = join(this.dataDirectory, scope);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    if (!(await lstat(directory)).isDirectory()) throw new Error("Review directory must not be a symlink");
    return directory;
  }

  async save(scope: string, review: Review): Promise<void> {
    return this.exclusive(async () => {
      if (!isReview(review)) throw new Error("Invalid review record");
      const directory = await this.directory(scope);
      const temporary = join(directory, `.${randomUUID()}.tmp`);
      try {
        const file = await open(temporary, "wx", 0o600);
        try { await file.writeFile(JSON.stringify(review)); await file.sync(); } finally { await file.close(); }
        await rename(temporary, join(directory, `${review.id}.json`));
      } finally { await rm(temporary, { force: true }); }
    });
  }

  async read(scope: string, id: unknown): Promise<Review> {
    return this.exclusive(async () => {
      if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid review id");
      const path = join(await this.directory(scope), `${id}.json`);
      // O_NOFOLLOW is not enforced on Windows; reject existing links there too.
      if (!(await lstat(path)).isFile()) throw new Error("Invalid review file");
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const stat = await file.stat();
        if (!stat.isFile() || stat.size > 300_000) throw new Error("Invalid review file");
        const value: unknown = JSON.parse(await file.readFile("utf8"));
        if (!isReview(value) || value.id !== id) throw new Error("Invalid saved review");
        return value;
      } finally { await file.close(); }
    });
  }

  async list(scope: string): Promise<Review[]> {
    const names = await readdir(await this.directory(scope));
    const reviews: Review[] = [];
    for (const name of names) {
      if (/^[a-f0-9-]{36}\.json$/.test(name)) reviews.push(await this.read(scope, name.slice(0, -5)));
    }
    return reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  }
}
