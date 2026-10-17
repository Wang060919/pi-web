// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { ThinkingLevelLabel } from "./ThinkingLevelLabel";

const options = [
  { value: "off", label: "Off" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra high" },
  { value: "max", label: "Maximum" },
];

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

async function mount(value = "off") {
  const label = new ThinkingLevelLabel();
  label.options = options;
  label.value = value;
  label.textContent = options.find((option) => option.value === value)?.label ?? value;
  document.body.append(label);
  await label.updateComplete;
  return label;
}

async function select(label: ThinkingLevelLabel, value: string) {
  label.value = value;
  label.textContent = label.options.find((option) => option.value === value)?.label ?? value;
  await label.updateComplete;
}

function current(label: ThinkingLevelLabel) {
  const element = label.renderRoot.querySelector<HTMLElement>(".current");
  if (element === null) throw new Error("Missing current thinking label");
  return element;
}

function direction(label: ThinkingLevelLabel) {
  return label.renderRoot.querySelector(".visual")?.getAttribute("data-direction");
}

describe("ThinkingLevelLabel", () => {
  it("initially exposes only the parent's current text and does not animate", async () => {
    const label = await mount("medium");
    expect(current(label).textContent).toBe("Medium");
    expect(direction(label)).toBeNull();
    expect(label.renderRoot.querySelector(".outgoing")).toBeNull();
    expect(label.textContent).toBe("Medium");
    const slot = label.renderRoot.querySelector("slot");
    expect(slot?.assignedNodes().map((node) => node.textContent).join("")).toBe("Medium");
    expect(label.renderRoot.querySelector(".visual")?.getAttribute("aria-hidden")).toBe("true");
    expect(label.renderRoot.querySelector(".width-reserve")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("rolls every supported level in the direction defined by the options", async () => {
    const label = await mount();
    const destinations = [...options.slice(1), ...options.slice(0, -1).reverse()];
    for (const destination of destinations) {
      const previousValue = label.value;
      const previousLabel = current(label).textContent;
      await select(label, destination.value);
      expect(current(label).textContent).toBe(destination.label);
      expect(label.renderRoot.querySelector(".outgoing")?.textContent).toBe(previousLabel);
      expect(direction(label)).toBe(options.findIndex((option) => option.value === destination.value) > options.findIndex((option) => option.value === previousValue) ? "up" : "down");
      current(label).dispatchEvent(new Event("animationend", { bubbles: true }));
      await label.updateComplete;
      expect(label.renderRoot.querySelector(".outgoing")).toBeNull();
      expect(current(label).textContent).toBe(destination.label);
    }
  });

  it("does not replay on same-value saving feedback and replaces translated text without assuming a direction", async () => {
    const label = await mount("low");
    await select(label, "high");
    const incoming = current(label);
    label.options = [...options];
    label.requestUpdate();
    await label.updateComplete;
    expect(current(label)).toBe(incoming);
    expect(direction(label)).toBe("up");
    incoming.dispatchEvent(new Event("animationend", { bubbles: true }));
    await label.updateComplete;
    const settled = current(label);
    label.options = [...options];
    await label.updateComplete;
    expect(current(label)).toBe(settled);
    expect(direction(label)).toBeNull();
    label.options = options.map((option) => option.value === "high" ? { ...option, label: "高" } : option);
    label.textContent = "高";
    await label.updateComplete;
    expect(current(label).textContent).toBe("高");
    expect(direction(label)).toBeNull();
    expect(label.renderRoot.querySelector(".outgoing")).toBeNull();
  });

  it("keeps only the previous target when rapidly reversing and ignores stale animation completions", async () => {
    const label = await mount("low");
    await select(label, "max");
    const superseded = current(label);
    await select(label, "medium");
    expect(label.renderRoot.querySelectorAll(".layer")).toHaveLength(2);
    expect(label.renderRoot.querySelector(".outgoing")?.textContent).toBe("Maximum");
    expect(current(label).textContent).toBe("Medium");
    expect(current(label)).not.toBe(superseded);
    expect(direction(label)).toBe("down");
    superseded.dispatchEvent(new Event("animationend", { bubbles: true }));
    await label.updateComplete;
    expect(direction(label)).toBe("down");
    expect(label.renderRoot.querySelectorAll(".layer")).toHaveLength(2);
    current(label).dispatchEvent(new Event("animationend", { bubbles: true }));
    await label.updateComplete;
    expect(label.renderRoot.querySelectorAll(".layer")).toHaveLength(1);
    expect(direction(label)).toBeNull();
  });

  it("does not invent a direction for unknown values or newly available choices", async () => {
    const label = await mount("custom");
    expect(current(label).textContent).toBe("custom");
    await select(label, "low");
    expect(direction(label)).toBeNull();
    await select(label, "custom");
    expect(direction(label)).toBeNull();
    label.options = [{ value: "custom", label: "Custom" }, ...options];
    await label.updateComplete;
    expect(current(label).textContent).toBe("Custom");
    expect(direction(label)).toBeNull();
    label.value = undefined;
    label.textContent = "Not set";
    await label.updateComplete;
    expect(current(label).textContent).toBe("Not set");
    expect(direction(label)).toBeNull();
  });

  it("reconnects with the current label without replaying an interrupted transition", async () => {
    const label = await mount("low");
    await select(label, "high");
    const interrupted = current(label);
    label.remove();
    document.body.append(label);
    await label.updateComplete;
    interrupted.dispatchEvent(new Event("animationend", { bubbles: true }));
    await label.updateComplete;
    expect(current(label).textContent).toBe("High");
    expect(direction(label)).toBeNull();
    expect(label.renderRoot.querySelector(".outgoing")).toBeNull();
  });
});
