import { EnvHttpProxyAgent, fetch } from "undici";

const VERSION_CHECK_TIMEOUT_MS = 5000;

export async function fetchLatestNpmVersion(packageName: string, currentVersion: string, registryOrigin = "https://registry.npmjs.org"): Promise<string> {
  let dispatcher: EnvHttpProxyAgent;
  try {
    dispatcher = new EnvHttpProxyAgent();
  } catch (error) {
    // Proxy URLs may contain credentials. Keep configuration errors out of the UI.
    throw new Error("Invalid npm update-check proxy configuration", { cause: error });
  }

  try {
    const response = await fetch(new URL(`${encodeURIComponent(packageName)}/latest`, `${registryOrigin}/`), {
      dispatcher,
      headers: {
        accept: "application/json",
        "user-agent": `${packageName}/${currentVersion}`,
        "cache-control": "no-cache",
      },
      signal: AbortSignal.timeout(VERSION_CHECK_TIMEOUT_MS),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`npm registry returned HTTP ${String(response.status)}`);
    }
    const data: unknown = await response.json();
    const version = typeof data === "object" && data !== null && "version" in data ? data.version : undefined;
    if (typeof version !== "string" || version === "") throw new Error("npm registry response did not include a version");
    return version;
  } catch (error) {
    if (error instanceof Error && error.cause instanceof Error) {
      throw new Error(`${error.message}: ${error.cause.message}`, { cause: error });
    }
    throw error;
  } finally {
    await dispatcher.close();
  }
}
