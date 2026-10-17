// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { ThinkingPicker } from "./ThinkingPicker";
import { ThinkingLevelLabel } from "./ThinkingLevelLabel";
import { ModalSurface } from "./ModalSurface";
import { ModelPicker } from "./ModelPicker";
import { deepActiveElement, dialogSection, dialogSurface, pressKey, requiredElement, settleRenderedDialog, surfaceBackdrop } from "./modalSurfaceTestSupport";

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("thinking-picker", () => {
  it("previews range input locally, commits once on change, and stays open after success", async () => {
    const pending = deferred<boolean>();
    const onPick = vi.fn<(value: string) => Promise<boolean>>().mockReturnValue(pending.promise);
    const onCancel = vi.fn();
    const picker = await mountPicker((element) => {
      element.onPick = onPick;
      element.onCancel = onCancel;
    });
    const input = range(picker);
    const headerValue = requiredElement(picker.shadowRoot?.querySelector("header output"), "header strength");
    const rollingLabel = headerValue.querySelector("thinking-level-label");
    if (!(rollingLabel instanceof ThinkingLevelLabel)) throw new Error("Rolling strength label missing");
    expect(rollingLabel.value).toBe("medium");
    expect(picker.shadowRoot?.querySelector("header strong")?.textContent).toBe("Thinking strength");
    expect(headerValue.textContent).toBe("Medium");
    expect(headerValue.getAttribute("aria-label")).toBe("Current");
    expect([...picker.renderRoot.querySelectorAll(".strength-scale span")].map((label) => label.textContent)).toEqual(["Faster", "More thorough"]);

    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settleRenderedDialog(picker);
    expect(onPick).not.toHaveBeenCalled();
    expect(picker.selectedValue).toBe("medium");
    expect(valueText(picker)).toBe("Extra high");
    expect(rollingLabel.value).toBe("xhigh");
    expect(headerValue.querySelector("thinking-level-label")).toBe(rollingLabel);
    expect(headerValue.getAttribute("aria-label")).toBe("Preview");
    expect(picker.shadowRoot?.querySelector(".description")?.textContent).toBe("More time for deeper reasoning.");

    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await settleRenderedDialog(picker);
    expect(onPick).toHaveBeenCalledExactlyOnceWith("xhigh");
    expect(range(picker).disabled).toBe(true);
    expect(levelButtons(picker).every((button) => button.disabled)).toBe(true);
    expect(picker.shadowRoot?.querySelector('[role="status"]')?.textContent).toBe("Drag to preview, release to apply.");
    expect(dialogSection(picker).getAttribute("aria-busy")).toBe("true");
    pressKey(dialogSurface(picker), "Escape");
    expect(onCancel).not.toHaveBeenCalled();
    input.blur();

    picker.selectedValue = "xhigh";
    pending.resolve(true);
    await pending.promise;
    await settleRenderedDialog(picker);
    expect(range(picker).disabled).toBe(false);
    expect(deepActiveElement()).toBe(range(picker));
    expect(valueText(picker)).toBe("Extra high");
    expect(headerValue.getAttribute("aria-label")).toBe("Current");
    expect(picker.isConnected).toBe(true);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it.each([true, false])("delays save feedback in the existing help line and clears it after completion (%s)", async (applied) => {
    vi.useFakeTimers();
    const pending = deferred<boolean>();
    const picker = await mountPicker((element) => { element.onPick = vi.fn().mockReturnValue(pending.promise); });
    const help = requiredElement(picker.shadowRoot?.querySelector('[role="status"]'), "save feedback");
    range(picker).value = "2";
    range(picker).dispatchEvent(new Event("change", { bubbles: true }));
    await settleRenderedDialog(picker);
    await vi.advanceTimersByTimeAsync(200);
    expect(help.textContent).toBe("Drag to preview, release to apply.");
    await vi.advanceTimersByTimeAsync(200);
    expect(picker.shadowRoot?.querySelector('[role="status"]')).toBe(help);
    expect(help.textContent).toBe("Saving…");
    if (applied) picker.selectedValue = "xhigh";
    pending.resolve(applied);
    await pending.promise;
    await settleRenderedDialog(picker);
    expect(help.textContent).toBe("Drag to preview, release to apply.");
    expect(range(picker).disabled).toBe(false);
    expect(valueText(picker)).toBe(applied ? "Extra high" : "Medium");
    await vi.advanceTimersByTimeAsync(1000);
    expect(help.textContent).toBe("Drag to preview, release to apply.");
  });

  it("cancels delayed save feedback when the picker disconnects", async () => {
    vi.useFakeTimers();
    const pending = deferred<boolean>();
    const picker = await mountPicker((element) => { element.onPick = vi.fn().mockReturnValue(pending.promise); });
    range(picker).value = "2";
    range(picker).dispatchEvent(new Event("change", { bubbles: true }));
    await settleRenderedDialog(picker);
    picker.remove();
    await vi.advanceTimersByTimeAsync(1000);
    expect(picker.shadowRoot?.querySelector('[role="status"]')?.textContent).toBe("Drag to preview, release to apply.");
    pending.resolve(false);
    await pending.promise;
  });

  it.each([false, new Error("offline")])("rolls back a failed change and explains the failure (%s)", async (result) => {
    const picker = await mountPicker((element) => {
      element.onPick = result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);
    });
    const input = range(picker);
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settleRenderedDialog(picker);
    expect(valueText(picker)).toBe("Extra high");
    input.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => {
      expect(picker.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Could not change thinking strength. Try again.");
    });
    expect(valueText(picker)).toBe("Medium");
    expect(range(picker).value).toBe("1");
    expect(range(picker).disabled).toBe(false);
    expect(picker.selectedValue).toBe("medium");
  });

  it("commits clickable labels without turning the default action into a session change", async () => {
    const onPick = vi.fn<(value: string) => Promise<boolean>>();
    const picker = await mountPicker((element) => {
      element.onPick = onPick;
      element.onSetDefault = vi.fn().mockResolvedValue(true);
      element.defaultValue = "off";
    });
    onPick.mockImplementation((value) => {
      picker.selectedValue = value;
      return Promise.resolve(true);
    });
    requiredElement(levelButtons(picker)[2], "extra high label").click();
    await settleRenderedDialog(picker);
    expect(onPick).toHaveBeenCalledExactlyOnceWith("xhigh");
    expect(picker.defaultValue).toBe("off");
    expect(valueText(picker)).toBe("Extra high");
    expect(picker.isConnected).toBe(true);
  });

  it("saves the preview as a separate default and waits for the host's stored marker", async () => {
    const pending = deferred<boolean>();
    const onSetDefault = vi.fn<(value: string) => Promise<unknown>>().mockReturnValue(pending.promise);
    const picker = await mountPicker((element) => {
      element.onSetDefault = onSetDefault;
      element.defaultValue = "off";
    });
    const input = range(picker);
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settleRenderedDialog(picker);
    defaultButton(picker).click();
    await settleRenderedDialog(picker);
    expect(onSetDefault).toHaveBeenCalledExactlyOnceWith("xhigh");
    expect(picker.onPick).not.toHaveBeenCalled();
    expect(picker.selectedValue).toBe("medium");
    expect(defaultButton(picker).disabled).toBe(true);
    expect(picker.shadowRoot?.querySelector(".stored-default strong")?.textContent).toBe("Off");

    pending.resolve(true);
    await pending.promise;
    await settleRenderedDialog(picker);
    expect(picker.shadowRoot?.querySelector(".stored-default strong")?.textContent).toBe("Off");
    picker.defaultValue = "xhigh";
    await settleRenderedDialog(picker);
    expect(picker.shadowRoot?.querySelector(".stored-default strong")?.textContent).toBe("Extra high");
    expect(defaultButton(picker).disabled).toBe(true);
    expect(picker.selectedValue).toBe("medium");
  });

  it("disables default editing while loading and reports a rejected default independently", async () => {
    const onSetDefault = vi.fn<(value: string) => Promise<unknown>>().mockResolvedValue(false);
    const picker = await mountPicker((element) => {
      element.onSetDefault = onSetDefault;
      element.defaultValue = "off";
      element.defaultsLoading = true;
    });
    expect(defaultButton(picker).disabled).toBe(true);
    expect(range(picker).disabled).toBe(false);
    expect(picker.shadowRoot?.querySelector(".stored-default strong")?.textContent).toBe("Loading default…");
    picker.defaultsLoading = false;
    await settleRenderedDialog(picker);
    defaultButton(picker).click();
    await vi.waitFor(() => {
      expect(picker.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Could not save the new-session default. Try again.");
    });
    expect(picker.onPick).not.toHaveBeenCalled();
    expect(picker.defaultValue).toBe("off");
    expect(picker.selectedValue).toBe("medium");
  });

  it("uses dynamic ordered choices without inventing intermediate thinking levels", async () => {
    const picker = await mountPicker((element) => {
      element.options = [{ value: "minimal", label: "Minimal" }, { value: "max", label: "Maximum" }];
      element.selectedValue = "max";
    });
    expect(range(picker).min).toBe("0");
    expect(range(picker).max).toBe("1");
    expect(range(picker).step).toBe("1");
    expect(range(picker).value).toBe("1");
    expect(levelButtons(picker).map((button) => button.textContent.trim())).toEqual(["Minimal", "Maximum"]);

    range(picker).value = "0";
    range(picker).dispatchEvent(new Event("input", { bubbles: true }));
    await settleRenderedDialog(picker);
    expect(valueText(picker)).toBe("Minimal");
    picker.options = [{ value: "off", label: "Off" }, { value: "xhigh", label: "Extra high" }];
    picker.selectedValue = "xhigh";
    await settleRenderedDialog(picker);
    expect(valueText(picker)).toBe("Extra high");
    expect(range(picker).value).toBe("1");
    expect(picker.onPick).not.toHaveBeenCalled();
  });

  it.each([
    { options: [], selected: undefined, help: "No thinking levels available for this model.", value: "Not set" },
    { options: [{ value: "only", label: "Only level" }], selected: "only", help: "This model has one available thinking level.", value: "Only level" },
  ])("disables an unavailable or fixed range ($value)", async ({ options, selected, help, value }) => {
    const picker = await mountPicker((element) => {
      element.options = options;
      element.selectedValue = selected;
    });
    expect(range(picker).disabled).toBe(true);
    expect(levelButtons(picker)).toHaveLength(options.length);
    expect(picker.shadowRoot?.querySelector(".help")?.textContent).toBe(help);
    expect(valueText(picker)).toBe(value);
    expect(picker.onPick).not.toHaveBeenCalled();
  });

  it("shows an unknown current value without marking the first option as current", async () => {
    const picker = await mountPicker((element) => {
      element.selectedValue = "unrecognized-level";
      element.onSetDefault = vi.fn().mockResolvedValue(true);
    });
    expect(valueText(picker)).toBe("unrecognized-level");
    expect(range(picker).getAttribute("aria-valuetext")).toBe("unrecognized-level");
    expect(levelButtons(picker).every((button) => button.getAttribute("aria-pressed") === "false")).toBe(true);
    expect(defaultButton(picker).disabled).toBe(true);
    expect(picker.shadowRoot?.querySelector(".description")?.textContent).toBe("Choose a supported level to change thinking strength.");

    range(picker).value = "1";
    range(picker).dispatchEvent(new Event("input", { bubbles: true }));
    await settleRenderedDialog(picker);
    expect(valueText(picker)).toBe("Medium");
    expect(defaultButton(picker).disabled).toBe(false);
    expect(picker.selectedValue).toBe("unrecognized-level");
    expect(picker.onPick).not.toHaveBeenCalled();
  });

  it("uses modal focus and dismissal while leaving native range keys alone", async () => {
    const onCancel = vi.fn();
    const picker = await mountPicker((element) => { element.onCancel = onCancel; });
    expect(deepActiveElement()).toBe(range(picker));
    expect(dialogSection(picker).getAttribute("aria-label")).toBe("Thinking strength");
    // happy-dom does not implement the browser's range-key default action.
    // Verify that the component leaves those keys to the native input.
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) expect(pressKey(range(picker), key).defaultPrevented).toBe(false);
    expect(picker.onPick).not.toHaveBeenCalled();
    pressKey(dialogSurface(picker), "Escape");
    expect(onCancel).toHaveBeenCalledOnce();
    surfaceBackdrop(picker).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

describe("embedded thinking-picker", () => {
  it("renders compact controls inside one owning modal without a nested dialog or close control", async () => {
    const { picker, surface } = await mountEmbedded();
    expect(picker.shadowRoot?.querySelector("modal-surface")).toBeNull();
    expect(picker.shadowRoot?.querySelector("header")).toBeNull();
    expect(picker.shadowRoot?.querySelector(".close")).toBeNull();
    expect(picker.shadowRoot?.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe("Thinking strength");
    expect(picker.shadowRoot?.querySelector(".current-value > span")?.textContent).toBe("Thinking strength");
    expect(valueText(picker)).toBe("Medium");
    expect(surface.shadowRoot?.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });

  it("locks externally disabled controls without claiming a child-owned save", async () => {
    const onBusyChange = vi.fn<(busy: boolean) => void>();
    const { picker, surface } = await mountEmbedded((element) => {
      element.disabled = true;
      element.onBusyChange = onBusyChange;
      element.onSetDefault = vi.fn().mockResolvedValue(true);
    });
    expect(range(picker).disabled).toBe(true);
    expect(levelButtons(picker).every((button) => button.disabled)).toBe(true);
    expect(defaultButton(picker).disabled).toBe(true);
    range(picker).value = "2";
    range(picker).dispatchEvent(new Event("input", { bubbles: true }));
    range(picker).dispatchEvent(new Event("change", { bubbles: true }));
    await settleEmbedded(picker, surface);
    expect(picker.onPick).not.toHaveBeenCalled();
    expect(onBusyChange).not.toHaveBeenCalled();
    expect(valueText(picker)).toBe("Medium");
    picker.disabled = false;
    await settleEmbedded(picker, surface);
    expect(range(picker).disabled).toBe(false);
  });

  it("notifies the parent of a save and restores the range after a failed submission", async () => {
    const pending = deferred<boolean>();
    const { picker, surface } = await mountEmbedded((element) => {
      element.onPick = vi.fn<(value: string) => Promise<boolean>>().mockReturnValue(pending.promise);
    });
    const busy: boolean[] = [];
    picker.onBusyChange = (value) => { busy.push(value); surface.busy = value; };
    const input = range(picker);
    input.focus();
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settleEmbedded(picker, surface);
    expect(busy).toEqual([]);
    expect(picker.onPick).not.toHaveBeenCalled();
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await settleEmbedded(picker, surface);
    input.blur();
    expect(busy).toEqual([true]);
    expect(surface.busy).toBe(true);
    expect(input.disabled).toBe(true);
    pending.resolve(false);
    await pending.promise;
    await settleEmbedded(picker, surface);
    expect(busy).toEqual([true, false]);
    expect(surface.busy).toBe(false);
    expect(valueText(picker)).toBe("Medium");
    expect(picker.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Could not change thinking strength. Try again.");
    expect(deepActiveElement()).toBe(input);
  });

  it("preserves a higher modal's focus when an embedded save finishes", async () => {
    const pending = deferred<boolean>();
    const { picker, surface } = await mountEmbedded((element) => {
      element.onPick = vi.fn<(value: string) => Promise<boolean>>().mockReturnValue(pending.promise);
    });
    const input = range(picker);
    input.focus();
    input.value = "2";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await settleEmbedded(picker, surface);
    const higher = new ModalSurface();
    const higherButton = document.createElement("button");
    higherButton.textContent = "Higher dialog";
    higher.initialFocus = "button";
    higher.append(higherButton);
    document.body.append(higher);
    await higher.updateComplete;
    expect(deepActiveElement()).toBe(higherButton);

    pending.resolve(true);
    await pending.promise;
    await settleEmbedded(picker, surface);
    expect(deepActiveElement()).toBe(higherButton);
    expect(picker.shadowRoot?.querySelector("modal-surface")).toBeNull();
  });

  it("retains independent default saving and returns focus to the range through the parent surface", async () => {
    const pending = deferred<boolean>();
    const onBusyChange = vi.fn<(busy: boolean) => void>();
    const { picker, surface } = await mountEmbedded((element) => {
      element.defaultValue = "off";
      element.onSetDefault = vi.fn<(value: string) => Promise<unknown>>().mockReturnValue(pending.promise);
      element.onBusyChange = onBusyChange;
    });
    const button = defaultButton(picker);
    button.focus();
    button.click();
    await settleEmbedded(picker, surface);
    button.blur();
    expect(picker.onSetDefault).toHaveBeenCalledExactlyOnceWith("medium");
    expect(onBusyChange).toHaveBeenCalledExactlyOnceWith(true);
    expect(picker.onPick).not.toHaveBeenCalled();
    pending.resolve(false);
    await pending.promise;
    await settleEmbedded(picker, surface);
    expect(onBusyChange.mock.calls.map(([busy]) => busy)).toEqual([true, false]);
    expect(picker.selectedValue).toBe("medium");
    expect(picker.defaultValue).toBe("off");
    expect(picker.shadowRoot?.querySelector('[role="alert"]')?.textContent).toBe("Could not save the new-session default. Try again.");
    expect(deepActiveElement()).toBe(range(picker));
  });

  it("returns focus to the range when a successful controlled default disables its save button", async () => {
    const { picker, surface } = await mountEmbedded((element) => {
      element.defaultValue = "off";
      element.onSetDefault = (value) => {
        element.defaultValue = value;
        return Promise.resolve(true);
      };
    });
    const button = defaultButton(picker);
    button.focus();
    button.click();
    await settleEmbedded(picker, surface);

    expect(picker.defaultValue).toBe("medium");
    expect(button.disabled).toBe(true);
    expect(picker.shadowRoot?.querySelector(".stored-default strong")?.textContent).toBe("Medium");
    expect(range(picker).disabled).toBe(false);
    expect(deepActiveElement()).toBe(range(picker));
    expect(picker.onPick).not.toHaveBeenCalled();
  });

  it("restores range focus after a parent model picker applies a saved default", async () => {
    const owner = new ModelPicker();
    owner.popoverMode = true;
    owner.options = [{ value: "provider/model", label: "Model" }];
    owner.selectedValue = "provider/model";
    owner.thinking = {
      options: [{ value: "off", label: "Off" }, { value: "medium", label: "Medium" }],
      selectedValue: "medium",
      defaultValue: "off",
      defaultsLoading: false,
      onPick: vi.fn<(value: string) => Promise<boolean>>().mockResolvedValue(true),
      onSetDefault: (value) => {
        if (owner.thinking === undefined) throw new Error("Parent thinking controls were unavailable");
        // Match the application boundary: update the parent, which then passes
        // the controlled default through its next render to the embedded child.
        owner.thinking = { ...owner.thinking, defaultValue: value };
        return Promise.resolve(true);
      },
    };
    document.body.append(owner);
    await settleRenderedDialog(owner);
    const picker = owner.renderRoot.querySelector("thinking-picker");
    if (!(picker instanceof ThinkingPicker)) throw new Error("Parent did not render embedded thinking controls");
    await picker.updateComplete;
    const button = defaultButton(picker);
    expect(deepActiveElement()).toBe(owner.renderRoot.querySelector("input.search"));
    // Native click focus varies by browser. Saving must restore the range even
    // when clicking this button did not first make it the active element.
    button.click();
    await settleRenderedDialog(owner);
    await picker.updateComplete;
    await picker.updateComplete;

    expect(owner.thinking.defaultValue).toBe("medium");
    expect(picker.defaultValue).toBe("medium");
    expect(button.disabled).toBe(true);
    expect(picker.shadowRoot?.querySelector(".stored-default strong")?.textContent).toBe("Medium");
    expect(deepActiveElement()).toBe(range(picker));
  });
});

async function mountPicker(configure: (picker: ThinkingPicker) => void = () => undefined): Promise<ThinkingPicker> {
  const picker = createPicker(configure);
  document.body.append(picker);
  await settleRenderedDialog(picker);
  return picker;
}

function createPicker(configure: (picker: ThinkingPicker) => void): ThinkingPicker {
  const picker = new ThinkingPicker();
  picker.options = [
    { value: "off", label: "Off", description: "No extra reasoning." },
    { value: "medium", label: "Medium", description: "Balanced reasoning." },
    { value: "xhigh", label: "Extra high", description: "More time for deeper reasoning." },
  ];
  picker.selectedValue = "medium";
  picker.onPick = vi.fn<(value: string) => Promise<boolean>>().mockResolvedValue(true);
  configure(picker);
  return picker;
}

async function mountEmbedded(configure: (picker: ThinkingPicker) => void = () => undefined): Promise<{ picker: ThinkingPicker; surface: ModalSurface }> {
  const picker = createPicker(configure);
  picker.embedded = true;
  const surface = new ModalSurface();
  const search = document.createElement("input");
  search.className = "model-search";
  surface.initialFocus = ".model-search";
  surface.append(search, picker);
  document.body.append(surface);
  await settleEmbedded(picker, surface);
  return { picker, surface };
}

async function settleEmbedded(picker: ThinkingPicker, surface: ModalSurface): Promise<void> {
  await picker.updateComplete;
  await surface.updateComplete;
  await picker.updateComplete;
}

function range(picker: ThinkingPicker): HTMLInputElement {
  return requiredElement(picker.shadowRoot?.querySelector<HTMLInputElement>('input[type="range"]'), "thinking range");
}

function valueText(picker: ThinkingPicker): string | null | undefined {
  return picker.shadowRoot?.querySelector("output")?.textContent;
}

function levelButtons(picker: ThinkingPicker): HTMLButtonElement[] {
  return [...(picker.shadowRoot?.querySelectorAll<HTMLButtonElement>(".level") ?? [])];
}

function defaultButton(picker: ThinkingPicker): HTMLButtonElement {
  return requiredElement(picker.shadowRoot?.querySelector<HTMLButtonElement>(".set-default"), "set default button");
}

function deferred<Value>(): { promise: Promise<Value>; resolve: (value: Value) => void } {
  let resolver: ((value: Value) => void) | undefined;
  const promise = new Promise<Value>((resolve) => { resolver = resolve; });
  return { promise, resolve: (value) => {
    if (resolver === undefined) throw new Error("Deferred resolver was unavailable");
    resolver(value);
  } };
}
