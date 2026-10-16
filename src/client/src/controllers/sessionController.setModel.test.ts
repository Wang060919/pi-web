import { describe, expect, it, vi } from "vitest";
import { initialAppState } from "../appState";
import { SessionController } from "./sessionController";
import { defaultApi, deferred, FakeSocket, oldSession, status, workspace, type AppState, type SessionStatus } from "./sessionController.testSupport";

function machine(id: string): NonNullable<AppState["selectedMachine"]> {
  return { id, name: id, kind: "remote", createdAt: "now", updatedAt: "now" };
}

function modelStatus(modelId: string): SessionStatus {
  return { ...status(oldSession.id), model: { provider: "openai", id: modelId }, thinkingLevel: "medium" };
}

function harness(overrides: Partial<Pick<typeof defaultApi, "setModel" | "thinkingLevels">>) {
  const initialStatus = modelStatus("old-model");
  let state: AppState = {
    ...initialAppState(), selectedMachine: machine("remote-a"), selectedWorkspace: workspace,
    selectedSession: oldSession, sessions: [oldSession], status: initialStatus,
    sessionStatuses: { [oldSession.id]: initialStatus }, availableThinkingLevels: ["off", "low"],
  };
  const update = (patch: Partial<AppState>) => { state = { ...state, ...patch }; };
  const controller = new SessionController(() => state, update, () => undefined, undefined, {
    api: { ...defaultApi, thinkingLevels: () => Promise.resolve({ levels: ["low", "high"] }), ...overrides },
    socket: new FakeSocket(),
  });
  return { controller, update, get state() { return state; } };
}

describe("SessionController model selection", () => {
  it("applies the actual returned model and refreshes its thinking levels on the same machine", async () => {
    const actualStatus = modelStatus("actual-model");
    const setModel = vi.fn<typeof defaultApi.setModel>().mockResolvedValue(actualStatus);
    const thinkingLevels = vi.fn<typeof defaultApi.thinkingLevels>().mockResolvedValue({ levels: ["minimal", "max"] });
    const h = harness({ setModel, thinkingLevels });

    await expect(h.controller.setModel("openai", "requested-model")).resolves.toBe(true);

    expect(setModel).toHaveBeenCalledWith(oldSession, "openai", "requested-model", "remote-a");
    expect(h.state.status).toBe(actualStatus);
    expect(h.state.sessionStatuses[oldSession.id]).toBe(actualStatus);
    expect(thinkingLevels).toHaveBeenCalledWith(oldSession, "remote-a");
    expect(h.state.availableThinkingLevels).toEqual(["minimal", "max"]);
  });

  it("accepts the successful model status when the socket delivered it before the HTTP response", async () => {
    const request = deferred<SessionStatus>();
    const h = harness({ setModel: () => request.promise });
    const pending = h.controller.setModel("openai", "new-model");
    h.update({ status: modelStatus("new-model") });
    const actualStatus = { ...modelStatus("new-model"), thinkingLevel: "high" };
    request.resolve(actualStatus);

    await expect(pending).resolves.toBe(true);
    expect(h.state.status).toBe(actualStatus);
    expect(h.state.availableThinkingLevels).toEqual(["low", "high"]);
  });

  it("returns false on API failure without changing the model or its thinking capabilities", async () => {
    const thinkingLevels = vi.fn<typeof defaultApi.thinkingLevels>();
    const h = harness({ setModel: () => Promise.reject(new Error("model change failed")), thinkingLevels });
    const initialStatus = h.state.status;
    const initialLevels = h.state.availableThinkingLevels;

    await expect(h.controller.setModel("openai", "new-model")).resolves.toBe(false);

    expect(h.state.status).toBe(initialStatus);
    expect(h.state.availableThinkingLevels).toBe(initialLevels);
    expect(thinkingLevels).not.toHaveBeenCalled();
    expect(Object.values(h.state.browserErrors).map((error) => error.message)).toContain("Error: model change failed");
  });

  it.each(["absent", "archived", "empty provider", "empty model"] as const)("does not request a switch for %s input", async (invalid) => {
    const setModel = vi.fn<typeof defaultApi.setModel>();
    const h = harness({ setModel });
    if (invalid === "absent") h.update({ selectedSession: undefined });
    if (invalid === "archived") h.update({ selectedSession: { ...oldSession, archived: true } });

    await expect(h.controller.setModel(invalid === "empty provider" ? "" : "openai", invalid === "empty model" ? "" : "new-model")).resolves.toBe(false);
    expect(setModel).not.toHaveBeenCalled();
  });

  it.each(["session", "machine", "model", "provider", "navigation"] as const)("ignores a model response after the %s origin changes", async (change) => {
    const request = deferred<SessionStatus>();
    const thinkingLevels = vi.fn<typeof defaultApi.thinkingLevels>();
    const h = harness({ setModel: () => request.promise, thinkingLevels });
    const initialStatus = h.state.status;
    const pending = h.controller.setModel("openai", "new-model");
    if (change === "session") h.update({ selectedSession: { ...oldSession, id: "other-session" }, status: status("other-session") });
    else if (change === "machine") h.update({ selectedMachine: machine("remote-b") });
    else if (change === "model") h.update({ status: modelStatus("other-model") });
    else if (change === "provider") h.update({ status: { ...modelStatus("old-model"), model: { provider: "other-provider", id: "old-model" } } });
    else {
      h.controller.clearActiveSession();
      h.update({ selectedSession: oldSession, status: initialStatus });
    }
    const selectedStatus = h.state.status;
    const sessionStatuses = h.state.sessionStatuses;
    request.resolve(modelStatus("new-model"));

    await expect(pending).resolves.toBe(false);
    expect(h.state.status).toBe(selectedStatus);
    expect(h.state.sessionStatuses).toBe(sessionStatuses);
    expect(thinkingLevels).not.toHaveBeenCalled();
    expect(h.state.browserErrors).toEqual({});
  });

  it.each(["machine", "model", "navigation"] as const)("does not apply old thinking capabilities after the %s changes during refresh", async (change) => {
    const request = deferred<{ levels: string[] }>();
    const thinkingLevels = vi.fn<typeof defaultApi.thinkingLevels>().mockReturnValue(request.promise);
    const h = harness({ setModel: () => Promise.resolve(modelStatus("new-model")), thinkingLevels });
    const pending = h.controller.setModel("openai", "new-model");
    await Promise.resolve();
    expect(thinkingLevels).toHaveBeenCalledOnce();
    if (change === "machine") h.update({ selectedMachine: machine("remote-b") });
    else if (change === "model") h.update({ status: modelStatus("other-model") });
    else {
      h.controller.clearActiveSession();
      h.update({ selectedSession: oldSession, status: modelStatus("new-model") });
    }
    h.update({ availableThinkingLevels: ["current-model-only"] });
    request.resolve({ levels: ["stale-model-only"] });

    await expect(pending).resolves.toBe(true);
    expect(h.state.availableThinkingLevels).toEqual(["current-model-only"]);
  });

  it("keeps a confirmed model switch successful when refreshing thinking capabilities fails", async () => {
    const actualStatus = modelStatus("new-model");
    const h = harness({ setModel: () => Promise.resolve(actualStatus), thinkingLevels: () => Promise.reject(new Error("capability refresh failed")) });

    await expect(h.controller.setModel("openai", "new-model")).resolves.toBe(true);

    expect(h.state.status).toBe(actualStatus);
    expect(h.state.availableThinkingLevels).toEqual([]);
    expect(Object.values(h.state.browserErrors).map((error) => error.message)).toContain("Error: capability refresh failed");
  });
});
