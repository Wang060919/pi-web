/** Keep fixed app chrome above keyboards which resize only the visual viewport. */
export class VisualViewportSizing {
  constructor(
    private readonly host: HTMLElement,
    private readonly viewport: (Pick<VisualViewport, "height" | "offsetTop" | "scale"> & EventTarget) | null | undefined = host.ownerDocument.defaultView?.visualViewport,
  ) {}

  connect(): void {
    this.viewport?.addEventListener("resize", this.update);
    this.viewport?.addEventListener("scroll", this.update);
    this.update();
  }

  disconnect(): void {
    this.viewport?.removeEventListener("resize", this.update);
    this.viewport?.removeEventListener("scroll", this.update);
    this.clear();
  }

  private readonly update = (): void => {
    const viewport = this.viewport;
    // Pinch zoom must magnify the page, not reflow the app into the zoomed area.
    if (viewport?.scale !== 1) {
      this.clear();
      return;
    }
    this.host.style.setProperty("--pi-viewport-height", `${String(viewport.height)}px`);
    this.host.style.setProperty("--pi-viewport-top", `${String(viewport.offsetTop)}px`);
  };

  private clear(): void {
    this.host.style.removeProperty("--pi-viewport-height");
    this.host.style.removeProperty("--pi-viewport-top");
  }
}
