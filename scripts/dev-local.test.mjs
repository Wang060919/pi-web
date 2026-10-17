import { expect, it } from "vitest";
import { developmentEnvironment, ownsRunner, parseProcessStat } from "./dev-local.mjs";

it("isolates state and drops credentials, daemon overrides, and loader injection", () => {
  const env = developmentEnvironment("/repo", "/tmp/private/sessiond.sock", {
    HOME: "/home/test", PATH: "/usr/bin", OPENAI_API_KEY: "secret", NODE_OPTIONS: "--require injection",
    LD_LIBRARY_PATH: "/appimage", PI_WEB_AGENT_DIR: "/production/agent", PI_WEB_AGENT_SESSION_DIR: "/production/sessions",
    PI_WEB_SESSIOND_URL: "http://production", PI_WEB_PROJECTS_FILE: "/production/projects.json",
    PI_WEB_ISOLATED_DEVELOPMENT: "0",
  });
  expect(env.PI_CODING_AGENT_DIR).toBe("/repo/.local/dev/agent");
  expect(env.PI_CODING_AGENT_SESSION_DIR).toBe("/repo/.local/dev/sessions");
  expect(env.PI_WEB_DATA_DIR).toBe("/repo/.local/dev/state");
  expect(env.PI_WEB_CONFIG).toBe("/repo/.local/dev/config.json");
  expect(env.PI_WEB_SESSIOND_SOCKET).toBe("/tmp/private/sessiond.sock");
  expect(env.PI_WEB_ISOLATED_DEVELOPMENT).toBe("1");
  for (const key of ["OPENAI_API_KEY", "NODE_OPTIONS", "LD_LIBRARY_PATH", "PI_WEB_AGENT_DIR", "PI_WEB_AGENT_SESSION_DIR", "PI_WEB_SESSIOND_URL", "PI_WEB_PROJECTS_FILE"]) {
    expect(env[key]).toBeUndefined();
  }
});

it("refuses a reused PID, foreign group, different command, directory, user, or token", () => {
  const record = { root: "/repo", pid: 42, startTime: "123", token: "nonce" };
  const actual = { pid: 42, uid: 1000, cwd: "/repo", startTime: "123", group: 42, session: 42, args: ["node", "/repo/scripts/dev-local.mjs", "--run", "nonce"] };
  const owns = (changes = {}) => ownsRunner(record, { ...actual, ...changes }, "/repo", "/repo/scripts/dev-local.mjs", 1000);
  expect(owns()).toBe(true);
  for (const changes of [
    { startTime: "124" }, { group: 41 }, { session: 41 }, { cwd: "/other" }, { uid: 1001 },
    { args: ["node", "/production/server.js", "--run", "nonce"] },
    { args: ["node", "/repo/scripts/dev-local.mjs", "--run", "different"] },
  ]) expect(owns(changes)).toBe(false);
  expect(ownsRunner(record, undefined, "/repo", "/repo/scripts/dev-local.mjs", 1000)).toBe(false);
});

it("parses Linux process identity even when the process name contains parentheses", () => {
  const fields = ["S", "1", "42", "42", ...Array(15).fill("0"), "123456", "0"];
  expect(parseProcessStat(`42 (name (with spaces)) ${fields.join(" ")}`)).toEqual({ group: 42, session: 42, startTime: "123456" });
});
