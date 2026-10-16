import { describe, expect, it, vi } from "vitest";
import { initialAppState } from "../appState";
import { SessionController } from "./sessionController";
import { defaultApi, deferred, FakeSocket, oldSession, status, workspace, type AppState, type SessionStatus } from "./sessionController.testSupport";

function machine(id: string): NonNullable<AppState["selectedMachine"]> {
  return { id, name: id, kind: "remote", createdAt: "now", updatedAt: "now" };
}

function harness(setThinkingLevel: typeof defaultApi.setThinkingLevel) {
  const initialStatus: SessionStatus = { ...status(oldSession.id), model: { provider: "openai", id: "gpt-5" }, thinkingLevel: "low" };
  let state: AppState = {
    ...initialAppState(), selectedMachine: machine("remote-a"), selectedWorkspace: workspace,
    selectedSession: oldSession, sessions: [oldSession], status: initialStatus,
    sessionStatuses: { [oldSession.id]: initialStatus },
  };
  const update = (patch: Partial<AppState>) => { state = { ...state, ...patch }; };
  const controller = new SessionController(() => state, update, () => undefined, undefined, {
    api: { ...defaultApi, setThinkingLevel }, socket: new FakeSocket(),
  });
  return { controller, update, get state() { return state; } };
}

describe("SessionController thinking level", () => {
  it("reports success only after applying the actual status returned by the session machine", async () => {
    const actualStatus: SessionStatus = { ...status(oldSession.id), model: { provider: "openai", id: "gpt-5" }, thinkingLevel: "high" };
    const setThinkingLevel = vi.fn<typeof defaultApi.setThinkingLevel>().mockResolvedValue(actualStatus);
    const h = harness(setThinkingLevel);

    await expect(h.controller.setThinkingLevel("max")).resolves.toBe(true);

    expect(setThinkingLevel).toHaveBeenCalledWith(oldSession, "max", "remote-a");
    expect(h.state.status).toBe(actualStatus);
    expect(h.state.sessionStatuses[oldSession.id]).toBe(actualStatus);
  });

  it("returns false on API failure while preserving status and reporting the error", async () => {
    const h = harness(() => Promise.reject(new Error("thinking update failed")));
    const initialStatus = h.state.status;
    const initialStatuses = h.state.sessionStatuses;

    await expect(h.controller.setThinkingLevel("high")).resolves.toBe(false);

    expect(h.state.status).toBe(initialStatus);
    expect(h.state.sessionStatuses).toBe(initialStatuses);
    expect(Object.values(h.state.browserErrors).map((error) => error.message)).toContain("Error: thinking update failed");
  });

  it.each(["absent", "archived"] as const)("does not request a change for an %s selection", async (selection) => {
    const setThinkingLevel = vi.fn<typeof defaultApi.setThinkingLevel>();
    const h = harness(setThinkingLevel);
    h.update({ selectedSession: selection === "absent" ? undefined : { ...oldSession, archived: true } });

    await expect(h.controller.setThinkingLevel("high")).resolves.toBe(false);
    expect(setThinkingLevel).not.toHaveBeenCalled();
  });

  it.each(["session", "machine", "model", "provider", "navigation"] as const)("ignores a response after the %s origin changes", async (change) => {
    const request = deferred<SessionStatus>();
    const h = harness(() => request.promise);
    const initialStatus = h.state.status;
    const pending = h.controller.setThinkingLevel("high");
    if (change === "session") {
      h.update({ selectedSession: { ...oldSession, id: "other-session" }, status: status("other-session") });
    } else if (change === "machine") {
      h.update({ selectedMachine: machine("remote-b") });
    } else if (change === "model" || change === "provider") {
      h.update({ status: { ...status(oldSession.id), model: { provider: change === "provider" ? "other-provider" : "openai", id: change === "model" ? "other-model" : "gpt-5" }, thinkingLevel: "medium" } });
    } else {
      h.controller.clearActiveSession();
      h.update({ selectedSession: oldSession, status: initialStatus });
    }
    const selectedStatus = h.state.status;
    const sessionStatuses = h.state.sessionStatuses;
    request.resolve({ ...status(oldSession.id), model: { provider: "openai", id: "gpt-5" }, thinkingLevel: "high" });

    await expect(pending).resolves.toBe(false);
    expect(h.state.status).toBe(selectedStatus);
    expect(h.state.sessionStatuses).toBe(sessionStatuses);
    expect(h.state.browserErrors).toEqual({});
  });
});
