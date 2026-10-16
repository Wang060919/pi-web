// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelPicker } from "./ModelPicker";
import { ThinkingPicker } from "./ThinkingPicker";
import { deepActiveElement, dialogSection, dialogSurface, pressKey, requiredElement, settleRenderedDialog, surfaceBackdrop } from "./modalSurfaceTestSupport";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("model-picker popover", () => {
  it("embeds thinking controls in the same modal and isolates their keys and pending saves", async () => {
    const pending = deferred<boolean>();
    const onThinkingPick = vi.fn<(value: string) => Promise<boolean>>().mockReturnValue(pending.promise);
    const onCancel = vi.fn();
    const picker = await mountPicker((element) => {
      element.onCancel = onCancel;
      element.thinking = {
        options: [{ value: "low", label: "Low" }, { value: "high", label: "High" }],
        selectedValue: "low", defaultValue: "high", defaultsLoading: false,
        onPick: onThinkingPick, onSetDefault: vi.fn().mockResolvedValue(true),
      };
    });
    const thinking = picker.renderRoot.querySelector("thinking-picker");
    if (!(thinking instanceof ThinkingPicker)) throw new Error("Embedded thinking controls missing");
    await thinking.updateComplete;
    expect(thinking.embedded).toBe(true);
    expect(thinking.renderRoot.querySelector("modal-surface")).toBeNull();
    const range = requiredElement(thinking.renderRoot.querySelector<HTMLInputElement>('input[type="range"]'), "thinking range");
    const arrow = pressKey(range, "ArrowUp");
    expect(arrow.defaultPrevented).toBe(false);
    pressKey(range, "Enter");
    expect(picker.onPick).not.toHaveBeenCalled();
    range.focus();
    range.value = "1";
    range.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    range.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await thinking.updateComplete;
    await settleRenderedDialog(picker);
    expect(onThinkingPick).toHaveBeenCalledExactlyOnceWith("high");
    expect(modelChoices(picker).every((choice) => choice.disabled)).toBe(true);
    expect(manage(picker).disabled).toBe(true);
    expect(dialogSection(picker).getAttribute("aria-busy")).toBe("true");
    pressKey(range, "Escape");
    expect(onCancel).not.toHaveBeenCalled();
    pending.resolve(false);
    await vi.waitFor(() => { expect(thinking.renderRoot.querySelector('[role="alert"]')?.textContent).toBe("Could not change thinking strength. Try again."); });
    await settleRenderedDialog(picker);
    expect(modelChoices(picker).every((choice) => !choice.disabled)).toBe(true);
    expect(picker.selectedValue).toBe("openai/gpt-5");
    expect(deepActiveElement()).toBe(range);
  });

  it("disables embedded thinking while a model switch is pending", async () => {
    const pending = deferred<boolean>();
    const onThinkingPick = vi.fn().mockResolvedValue(true);
    const picker = await mountPicker((element) => {
      element.onPick = vi.fn().mockReturnValue(pending.promise);
      element.thinking = {
        options: [{ value: "low", label: "Low" }, { value: "high", label: "High" }],
        selectedValue: "low", defaultValue: undefined, defaultsLoading: false,
        onPick: onThinkingPick,
      };
    });
    const thinking = picker.renderRoot.querySelector("thinking-picker");
    if (!(thinking instanceof ThinkingPicker)) throw new Error("Embedded thinking controls missing");
    requiredElement(modelChoices(picker)[1], "other model choice").click();
    await settleRenderedDialog(picker);
    await thinking.updateComplete;
    expect(thinking.disabled).toBe(true);
    expect(thinking.renderRoot.querySelector<HTMLInputElement>('input[type="range"]')?.disabled).toBe(true);
    thinking.renderRoot.querySelector<HTMLButtonElement>('.level[aria-label="High"]')?.click();
    expect(onThinkingPick).not.toHaveBeenCalled();
    pending.resolve(false);
    await pending.promise;
    await settleRenderedDialog(picker);
    await thinking.updateComplete;
    expect(thinking.disabled).toBe(false);
  });

  it("shows model names and providers with the actual current check separate from keyboard focus", async () => {
    const picker = await mountPicker();
    expect(picker.hasAttribute("popover")).toBe(false);
    expect(picker.shadowRoot?.querySelector(".popover-surface")).not.toBeNull();
    expect(picker.shadowRoot?.querySelector(".scope-toggle")).toBeNull();
    expect(deepActiveElement()).toBe(search(picker));
    expect(modelChoices(picker).map((choice) => choice.querySelector("strong")?.textContent)).toEqual(["GPT Five", "Sonnet"]);
    expect(modelChoices(picker).map((choice) => choice.querySelector("small")?.textContent)).toEqual(["openai", "anthropic"]);
    const current = requiredElement(modelChoices(picker)[0], "current model choice");
    const other = requiredElement(modelChoices(picker)[1], "other model choice");
    expect(current.title).toBe("openai/gpt-5");
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.querySelector(".current-check")?.textContent).toBe("✓");

    pressKey(search(picker), "ArrowDown");
    await settleRenderedDialog(picker);
    expect(other.closest(".popover-row")?.classList.contains("selected")).toBe(true);
    expect(other.getAttribute("aria-current")).toBeNull();
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(current.querySelector(".current-check")?.textContent).toBe("✓");
  });

  it("searches displayed names and commits the keyboard choice with its wire identity", async () => {
    const picker = await mountPicker();
    search(picker).value = "sonnet";
    search(picker).dispatchEvent(new Event("input", { bubbles: true }));
    await settleRenderedDialog(picker);
    expect(modelChoices(picker)).toHaveLength(1);
    expect(modelChoices(picker)[0]?.querySelector("strong")?.textContent).toBe("Sonnet");
    pressKey(search(picker), "Enter");
    expect(picker.onPick).toHaveBeenCalledExactlyOnceWith("anthropic/claude-4");
  });

  it("leaves IME confirmation and cancellation keys to the search input", async () => {
    const onCancel = vi.fn();
    const picker = await mountPicker((element) => { element.onCancel = onCancel; });
    for (const key of ["Enter", "Escape"]) {
      for (const composing of [{ isComposing: true }, { keyCode: 229 }]) {
        const event = new KeyboardEvent("keydown", { key, ...composing, bubbles: true, composed: true, cancelable: true });
        search(picker).dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      }
    }
    expect(picker.onPick).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("blocks overlapping edits while switching and keeps a failed selection open with the original current model", async () => {
    const pending = deferred<boolean>();
    const onPick = vi.fn<(value: string) => Promise<boolean>>().mockReturnValue(pending.promise);
    const onCancel = vi.fn();
    const picker = await mountPicker((element) => {
      element.onPick = onPick;
      element.onCancel = onCancel;
      element.onSetDefault = vi.fn().mockResolvedValue(true);
      element.defaultValue = "openai/gpt-5";
    });
    const other = requiredElement(modelChoices(picker)[1], "other model choice");
    other.click();
    other.click();
    await settleRenderedDialog(picker);
    expect(onPick).toHaveBeenCalledExactlyOnceWith("anthropic/claude-4");
    expect(search(picker).disabled).toBe(true);
    expect(modelChoices(picker).every((choice) => choice.disabled)).toBe(true);
    expect(defaultPins(picker).every((pin) => pin.disabled)).toBe(true);
    expect(manage(picker).disabled).toBe(true);
    expect(dialogSection(picker).getAttribute("aria-busy")).toBe("true");
    expect(picker.shadowRoot?.querySelector('[role="status"]')?.textContent).toBe("Switching model…");
    pressKey(dialogSurface(picker), "Escape");
    surfaceBackdrop(picker).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
    expect(onCancel).not.toHaveBeenCalled();

    pending.resolve(false);
    await pending.promise;
    await settleRenderedDialog(picker);
    expect(picker.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Could not switch model. Try again.");
    expect(modelChoices(picker)[0]?.getAttribute("aria-current")).toBe("true");
    expect(modelChoices(picker)[1]?.getAttribute("aria-current")).toBeNull();
    expect(search(picker).disabled).toBe(false);
    expect(deepActiveElement()).toBe(search(picker));
    expect(picker.isConnected).toBe(true);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("reports unexpected switch failures and lets the host own successful dismissal", async () => {
    const onPick = vi.fn<(value: string) => Promise<boolean>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(true);
    const onCancel = vi.fn();
    const picker = await mountPicker((element) => {
      element.onPick = onPick;
      element.onCancel = onCancel;
    });
    requiredElement(modelChoices(picker)[1], "other model choice").click();
    await vi.waitFor(() => { expect(picker.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Could not switch model. Try again."); });
    requiredElement(modelChoices(picker)[1], "other model choice").click();
    await settleRenderedDialog(picker);
    expect(onPick).toHaveBeenCalledTimes(2);
    expect(picker.shadowRoot?.querySelector('[role="alert"]')).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
    picker.selectedValue = "anthropic/claude-4";
    await settleRenderedDialog(picker);
    expect(modelChoices(picker)[1]?.getAttribute("aria-current")).toBe("true");
  });

  it("opens the full availability manager and returns through its Enabled scope toggle", async () => {
    const onToggleEnabled = vi.fn().mockResolvedValue(undefined);
    const picker = await mountPicker((element) => { element.onToggleEnabled = onToggleEnabled; });
    manage(picker).click();
    await settleRenderedDialog(picker);
    expect(picker.shadowRoot?.querySelector(".popover-surface")).toBeNull();
    expect(scope(picker, "All models").getAttribute("aria-pressed")).toBe("true");
    expect(picker.shadowRoot?.querySelectorAll(".catalog-row")).toHaveLength(3);
    const currentCheckbox = requiredElement(picker.shadowRoot?.querySelector<HTMLInputElement>('.catalog-row[data-model-value="openai/gpt-5"] input'), "current membership");
    expect(currentCheckbox.disabled).toBe(true);
    const available = requiredElement(picker.shadowRoot?.querySelector<HTMLButtonElement>('.catalog-row[data-model-value="google/gemini"] .membership'), "available model membership");
    available.click();
    await settleRenderedDialog(picker);
    expect(onToggleEnabled).toHaveBeenCalledExactlyOnceWith("google", "gemini", true);
    expect(picker.onPick).not.toHaveBeenCalled();

    scope(picker, "Enabled").click();
    await settleRenderedDialog(picker);
    expect(picker.shadowRoot?.querySelector(".popover-surface")).not.toBeNull();
    expect(picker.shadowRoot?.querySelector(".scope-toggle")).toBeNull();
    expect(deepActiveElement()).toBe(search(picker));
  });

  it("preserves workspace-controlled availability when managing from the popover", async () => {
    const picker = await mountPicker((element) => { element.catalog = element.catalog.map((entry) => ({ ...entry, editable: false })); });
    manage(picker).click();
    await settleRenderedDialog(picker);
    expect(picker.shadowRoot?.querySelector(".scope-notice")?.textContent).toContain("Project override");
    const checkboxes = [...(picker.shadowRoot?.querySelectorAll<HTMLInputElement>('.catalog-row input[type="checkbox"]') ?? [])];
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes.every((checkbox) => checkbox.disabled)).toBe(true);
    expect(scope(picker, "Enabled").disabled).toBe(false);
  });

  it("describes default stars explicitly and keeps failed default saves separate from selection", async () => {
    const pending = deferred<boolean>();
    const onSetDefault = vi.fn<(value: string) => Promise<unknown>>().mockReturnValue(pending.promise);
    const picker = await mountPicker((element) => {
      element.onSetDefault = onSetDefault;
      element.defaultValue = "openai/gpt-5";
    });
    expect(picker.shadowRoot?.querySelector(".popover-default-help")?.textContent).toBe("Stars set the default for new sessions.");
    expect(defaultPins(picker)[0]?.getAttribute("aria-pressed")).toBe("true");
    const otherPin = requiredElement(defaultPins(picker)[1], "other default pin");
    expect(otherPin.getAttribute("aria-label")).toBe("Use Sonnet as default for new sessions");
    otherPin.focus();
    otherPin.click();
    await settleRenderedDialog(picker);
    otherPin.blur();
    expect(onSetDefault).toHaveBeenCalledExactlyOnceWith("anthropic/claude-4");
    expect(search(picker).disabled).toBe(true);
    expect(manage(picker).disabled).toBe(true);
    expect(picker.onPick).not.toHaveBeenCalled();
    expect(picker.selectedValue).toBe("openai/gpt-5");
    pending.resolve(false);
    await pending.promise;
    await settleRenderedDialog(picker);
    expect(picker.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Could not save the new-session default. Try again.");
    expect(defaultPins(picker)[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(defaultPins(picker)[1]?.getAttribute("aria-pressed")).toBe("false");
    expect(picker.selectedValue).toBe("openai/gpt-5");
    expect(deepActiveElement()).toBe(search(picker));
  });

  it("keeps search available while default preferences load and handles an empty result", async () => {
    const picker = await mountPicker((element) => {
      element.onSetDefault = vi.fn().mockResolvedValue(true);
      element.defaultsLoading = true;
    });
    expect(defaultPins(picker).every((pin) => pin.disabled)).toBe(true);
    expect(search(picker).disabled).toBe(false);
    search(picker).value = "does-not-exist";
    search(picker).dispatchEvent(new Event("input", { bubbles: true }));
    await settleRenderedDialog(picker);
    expect(modelChoices(picker)).toHaveLength(0);
    expect(picker.shadowRoot?.querySelector(".empty")?.textContent).toBe("No matching models");
    expect(manage(picker).disabled).toBe(false);
  });
});

async function mountPicker(configure: (picker: ModelPicker) => void = () => undefined): Promise<ModelPicker> {
  const picker = new ModelPicker();
  picker.popoverMode = true;
  picker.selectedValue = "openai/gpt-5";
  picker.options = [
    { value: "openai/gpt-5", label: "gpt-5 ✓ current", description: "openai" },
    { value: "anthropic/claude-4", label: "claude-4", description: "anthropic" },
  ];
  picker.catalog = [
    { provider: "openai", id: "gpt-5", name: "GPT Five", enabled: true },
    { provider: "anthropic", id: "claude-4", name: "Sonnet", enabled: true },
    { provider: "google", id: "gemini", enabled: false },
  ];
  picker.onPick = vi.fn<(value: string) => Promise<boolean>>().mockResolvedValue(true);
  configure(picker);
  document.body.append(picker);
  await settleRenderedDialog(picker);
  return picker;
}

function search(picker: ModelPicker): HTMLInputElement {
  return requiredElement(picker.shadowRoot?.querySelector<HTMLInputElement>("input.search"), "model search");
}

function modelChoices(picker: ModelPicker): HTMLButtonElement[] {
  return [...(picker.shadowRoot?.querySelectorAll<HTMLButtonElement>(".model-choice") ?? [])];
}

function defaultPins(picker: ModelPicker): HTMLButtonElement[] {
  return [...(picker.shadowRoot?.querySelectorAll<HTMLButtonElement>(".default-pin") ?? [])];
}

function manage(picker: ModelPicker): HTMLButtonElement {
  return requiredElement(picker.shadowRoot?.querySelector<HTMLButtonElement>(".manage-models"), "manage available models");
}

function scope(picker: ModelPicker, label: string): HTMLButtonElement {
  return requiredElement([...(picker.shadowRoot?.querySelectorAll<HTMLButtonElement>(".scope-toggle button") ?? [])].find((button) => button.textContent.trim() === label), `${label} scope`);
}

function deferred<Value>(): { promise: Promise<Value>; resolve: (value: Value) => void } {
  let resolver: ((value: Value) => void) | undefined;
  const promise = new Promise<Value>((resolve) => { resolver = resolve; });
  return { promise, resolve: (value) => {
    if (resolver === undefined) throw new Error("Deferred resolver was unavailable");
    resolver(value);
  } };
}
