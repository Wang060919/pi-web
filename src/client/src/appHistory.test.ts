// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { appHistoryPosition, initializeAppHistory } from "./appHistory";
import { writeSettingsSection } from "./settingsRoute";
import { writeRoute } from "./route";

afterEach(() => { window.history.replaceState(null, "", "/"); });
it("keeps a shared history position across settings and app route writes, including replacements", () => {
  window.history.replaceState({ retained: "state" }, "", "/nested/?project=p");
  initializeAppHistory(); expect(appHistoryPosition()).toBe(0);
  writeSettingsSection("models"); expect(appHistoryPosition()).toBe(1);
  writeRoute({ machineId: "local", projectId: "p", workspaceId: "w", sessionId: "s", tool: undefined, view: "chat" });
  expect(appHistoryPosition()).toBe(2);
  writeSettingsSection("general", { replace: true }); expect(appHistoryPosition()).toBe(2);
  expect(window.history.state).toMatchObject({ retained: "state" });
  expect(new URL(window.location.href).searchParams.get("project")).toBe("p");
});
