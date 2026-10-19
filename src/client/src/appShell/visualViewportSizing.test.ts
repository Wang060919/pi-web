// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { VisualViewportSizing } from "./visualViewportSizing";

class TestViewport extends EventTarget {
  height = 844;
  offsetTop = 0;
  scale = 1;
}

function setup() {
  const host = document.createElement("div");
  const viewport = new TestViewport();
  const sizing = new VisualViewportSizing(host, viewport);
  sizing.connect();
  return { host, viewport, sizing };
}

describe("VisualViewportSizing", () => {
  it("tracks keyboard resize, viewport panning and keyboard dismissal without rerendering the editor", () => {
    const { host, viewport, sizing } = setup();
    expect(host.style.getPropertyValue("--pi-viewport-height")).toBe("844px");
    viewport.height = 440;
    viewport.dispatchEvent(new Event("resize"));
    expect(host.style.getPropertyValue("--pi-viewport-height")).toBe("440px");
    viewport.offsetTop = 60;
    viewport.dispatchEvent(new Event("scroll"));
    expect(host.style.getPropertyValue("--pi-viewport-top")).toBe("60px");
    viewport.height = 844;
    viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event("resize"));
    expect(host.style.getPropertyValue("--pi-viewport-height")).toBe("844px");
    expect(host.style.getPropertyValue("--pi-viewport-top")).toBe("0px");
    sizing.disconnect();
  });

  it("allows pinch zoom without shrinking the page layout", () => {
    const { host, viewport, sizing } = setup();
    viewport.scale = 2;
    viewport.height = 422;
    viewport.dispatchEvent(new Event("resize"));
    expect(host.style.getPropertyValue("--pi-viewport-height")).toBe("");
    expect(host.style.getPropertyValue("--pi-viewport-top")).toBe("");
    viewport.scale = 1;
    viewport.height = 844;
    viewport.dispatchEvent(new Event("resize"));
    expect(host.style.getPropertyValue("--pi-viewport-height")).toBe("844px");
    sizing.disconnect();
  });

  it("removes listeners and sizing overrides when disconnected", () => {
    const { host, viewport, sizing } = setup();
    sizing.disconnect();
    viewport.height = 300;
    viewport.dispatchEvent(new Event("resize"));
    viewport.dispatchEvent(new Event("scroll"));
    expect(host.style.length).toBe(0);
    sizing.connect();
    expect(host.style.getPropertyValue("--pi-viewport-height")).toBe("300px");
    sizing.disconnect();
  });
});
