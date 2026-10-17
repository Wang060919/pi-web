import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, realpath, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { modelConfigurationRecord } from "../../shared/modelConfiguration.js";

export class ModelConfigurationError extends Error {
  constructor(message: string, readonly statusCode = 400) { super(message); }
}

export interface StoredModelConfiguration {
  revision: string;
  config: Record<string, unknown>;
}

const queues = new Map<string, Promise<void>>();
const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** Strip JSON comments without changing quoted URLs, escaped quotes or string values. */
function jsonWithoutComments(text: string): string {
  let result = "";
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index] ?? "";
    if (quoted) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') { quoted = true; result += character; }
    else if (character === "/" && text[index + 1] === "/") {
      while (index < text.length && text[index] !== "\n") index++;
      result += "\n";
    } else if (character === "/" && text[index + 1] === "*") {
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) index++;
      if (index >= text.length) throw new ModelConfigurationError("The existing models.json has an unterminated comment; repair it before saving", 409);
      index++;
      result += " ";
    } else result += character;
  }
  return result.replace(/^\uFEFF/, "");
}

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export class ModelConfigurationStore {
  constructor(readonly path: string) {}

  async read(): Promise<StoredModelConfiguration> {
    let raw: string;
    try {
      if ((await stat(this.path)).size > MAX_FILE_BYTES) throw new ModelConfigurationError("models.json exceeds the configuration size limit", 409);
      raw = await readFile(this.path, "utf8");
    } catch (error) {
      if (missing(error)) return { revision: "missing", config: { providers: {} } };
      throw error;
    }
    let config: Record<string, unknown>;
    try { config = modelConfigurationRecord(JSON.parse(jsonWithoutComments(raw))); }
    catch { throw new ModelConfigurationError("The existing models.json is invalid; repair it before saving", 409); }
    if (config["providers"] !== undefined) modelConfigurationRecord(config["providers"]);
    return { revision: createHash("sha256").update(raw).digest("hex"), config };
  }

  async update(revision: string, transform: (current: Record<string, unknown>) => Promise<Record<string, unknown>>): Promise<StoredModelConfiguration> {
    const prior = queues.get(this.path) ?? Promise.resolve();
    const operation = prior.then(async () => {
      await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
      const destination = await realpath(this.path).catch((error: unknown) => { if (missing(error)) return this.path; throw error; });
      const lockPath = `${destination}.pi-web.lock`;
      try { await mkdir(lockPath); }
      catch (error) {
        if (error instanceof Error && "code" in error && error.code === "EEXIST") throw new ModelConfigurationError("Model configuration is locked by another writer. Retry after it finishes; a stale .pi-web.lock directory requires manual recovery", 409);
        throw error;
      }
      const temporary = join(dirname(destination), `.pi-web-models-${randomUUID()}.tmp`);
      try {
        const current = await this.read();
        if (current.revision !== revision) throw new ModelConfigurationError("Model configuration changed. Reload before saving", 409);
        const next = await transform(current.config);
        const raw = `${JSON.stringify(next, null, 2)}\n`;
        if (Buffer.byteLength(raw) > MAX_FILE_BYTES) throw new ModelConfigurationError("Model configuration exceeds the size limit");
        const handle = await open(temporary, "wx", 0o600);
        try { await handle.writeFile(raw, "utf8"); await handle.sync(); }
        finally { await handle.close(); }
        // Detect non-cooperating editor/CLI writes while validation was running.
        if ((await this.read()).revision !== revision) throw new ModelConfigurationError("Model configuration changed. Reload before saving", 409);
        await rename(temporary, destination);
        return { config: next, revision: createHash("sha256").update(raw).digest("hex") };
      } finally {
        await rm(temporary, { force: true });
        await rm(lockPath, { recursive: true });
      }
    });
    const settled = operation.then(() => undefined, () => undefined);
    queues.set(this.path, settled);
    void settled.then(() => { if (queues.get(this.path) === settled) queues.delete(this.path); });
    return operation;
  }
}
