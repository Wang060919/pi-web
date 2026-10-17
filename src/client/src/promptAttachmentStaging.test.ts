import { describe, expect, it, vi } from "vitest";
import { beginStagedAttachmentCapture, clearStagedAttachments, loadStagedAttachments, moveStagedAttachments, saveStagedAttachments, subscribeStagedAttachments, type PendingAttachment, type StagedAttachmentStore } from "./promptAttachmentStaging";

const attachment: PendingAttachment = { id: "attachment-1", kind: "file", name: "notes.txt", mimeType: "text/plain", data: "aGVsbG8=", size: 5 };

describe("promptAttachmentStaging", () => {
  it("returns an empty list for a key with nothing staged", () => {
    const store: StagedAttachmentStore = new Map();
    expect(loadStagedAttachments("local:session-a", store)).toEqual([]);
  });

  it("saves and loads attachments staged for a key", () => {
    const store: StagedAttachmentStore = new Map();
    saveStagedAttachments("local:session-a", [attachment], store);
    expect(loadStagedAttachments("local:session-a", store)).toEqual([attachment]);
  });

  it("drops the key once it is saved with no attachments left", () => {
    const store: StagedAttachmentStore = new Map();
    saveStagedAttachments("local:session-a", [attachment], store);
    saveStagedAttachments("local:session-a", [], store);
    expect(store.has("local:session-a")).toBe(false);
  });

  it("clears a key outright", () => {
    const store: StagedAttachmentStore = new Map();
    saveStagedAttachments("local:session-a", [attachment], store);
    clearStagedAttachments("local:session-a", store);
    expect(loadStagedAttachments("local:session-a", store)).toEqual([]);
  });

  it("moves staged attachments from one key to another, leaving the source empty", () => {
    const store: StagedAttachmentStore = new Map();
    saveStagedAttachments("local:temp-1", [attachment], store);
    moveStagedAttachments("local:temp-1", "local:session-a", store);
    expect(loadStagedAttachments("local:temp-1", store)).toEqual([]);
    expect(loadStagedAttachments("local:session-a", store)).toEqual([attachment]);
  });

  it("does nothing when moving from a key with nothing staged", () => {
    const store: StagedAttachmentStore = new Map();
    saveStagedAttachments("local:session-a", [attachment], store);
    moveStagedAttachments("local:temp-1", "local:session-a", store);
    expect(loadStagedAttachments("local:session-a", store)).toEqual([attachment]);
  });

  it("notifies only subscribers to the changed store/key and releases an old subscription once", () => {
    const store: StagedAttachmentStore = new Map();
    const source = vi.fn();
    const destination = vi.fn();
    const unrelated = vi.fn();
    const unsubscribe = subscribeStagedAttachments("source", source, store);
    const unsubscribeDestination = subscribeStagedAttachments("destination", destination, store);
    const unsubscribeOtherStore = subscribeStagedAttachments("source", unrelated, new Map());
    saveStagedAttachments("source", [attachment], store);
    moveStagedAttachments("source", "destination", store);
    expect(source.mock.calls).toEqual([[[attachment]], [[]]]);
    expect(destination).toHaveBeenLastCalledWith([attachment]);
    expect(unrelated).not.toHaveBeenCalled();
    unsubscribe();
    unsubscribeDestination();
    const replacement = vi.fn();
    const unsubscribeReplacement = subscribeStagedAttachments("source", replacement, store);
    unsubscribe();
    saveStagedAttachments("source", [attachment], store);
    clearStagedAttachments("source", store);
    expect(replacement.mock.calls).toEqual([[[attachment]], [[]]]);
    expect(source).toHaveBeenCalledTimes(2);
    unsubscribeReplacement();
    unsubscribeOtherStore();
  });

  it("moves pending capture ownership without stored files and appends to the latest destination until disposed", () => {
    const store: StagedAttachmentStore = new Map();
    const capture = beginStagedAttachmentCapture("temporary", store);
    moveStagedAttachments("temporary", "real", store);
    saveStagedAttachments("real", [attachment], store);
    const late = { ...attachment, id: "attachment-late", name: "late.txt" };
    capture.append([late]);
    expect(loadStagedAttachments("temporary", store)).toEqual([]);
    expect(loadStagedAttachments("real", store)).toEqual([attachment, late]);
    capture.dispose();
    const replacement = beginStagedAttachmentCapture("real", store);
    capture.dispose();
    moveStagedAttachments("real", "next", store);
    expect(capture.key).toBe("real");
    expect(replacement.key).toBe("next");
    expect(() => { capture.append([late]); }).toThrow("Attachment capture has already finished");
    replacement.dispose();
  });
});
