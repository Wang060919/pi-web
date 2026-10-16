import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { validImageDimensions, type ImageDimensions } from "../../../shared/sessionMedia";

export interface ImageOpenDetail {
  src: string;
  alt: string;
}

/** The owner authorizes sources; the browser owns image loading and failure display. */
@customElement("pi-web-image-presentation")
export class ImagePresentation extends LitElement {
  @property({ attribute: false }) source: string | undefined;
  @property({ attribute: false }) dimensions: ImageDimensions | undefined;
  /** Optional metadata report; loading never changes this component's own state. */
  @property({ attribute: false }) onIntrinsicDimensions: ((source: string, dimensions: ImageDimensions) => void) | undefined;
  @property() description = "";
  @property() label = "";
  @property({ type: Boolean }) requestDisabled = false;
  @property() pendingLabel = t("ImagePresentation.show_image.d44ff1f5");

  private requestImage(event: MouseEvent): void {
    if (this.requestDisabled) return;
    event.preventDefault();
    event.stopPropagation();
    this.dispatchEvent(new Event("image-request", { bubbles: true, composed: true }));
  }

  private reportIntrinsicDimensions(event: Event): void {
    const image = event.currentTarget;
    const source = this.source;
    if (this.onIntrinsicDimensions === undefined || !(image instanceof HTMLImageElement)
      || source === undefined || source === "" || image.getAttribute("src") !== source || !image.complete) return;
    const dimensions = validImageDimensions(image.naturalWidth, image.naturalHeight);
    if (dimensions !== undefined) this.onIntrinsicDimensions(source, dimensions);
  }

  private open(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.source === undefined || this.source === "") return;
    this.dispatchEvent(new CustomEvent<ImageOpenDetail>("image-open", {
      detail: { src: this.source, alt: this.description }, bubbles: true, composed: true,
    }));
  }

  override render() {
    const pending = this.source === undefined || this.source === "";
    const dimensions = this.dimensions;
    return localizedTemplate("ImagePresentation.template.97409eaa", html)`
      <div class="frame">
        <button class="placeholder" type="button" ?hidden=${!pending} ?disabled=${this.requestDisabled}
          @click=${(event: MouseEvent) => { this.requestImage(event); }}>
          <span>${this.pendingLabel}</span>${this.label === "" ? null : html`<code>${this.label}</code>`}
        </button>
        <button class="image-button" type="button" ?hidden=${pending} ?disabled=${pending}
          aria-label=${localizedText("ImagePresentation.enlarge.718d8165")`Enlarge ${this.description || t("ImagePresentation.image.47ceb860")}`} title="Click to enlarge"
          @click=${(event: MouseEvent) => { this.open(event); }}
          @keydown=${(event: KeyboardEvent) => { if (event.key === "Enter" || event.key === " ") this.open(event); }}>
          <img loading="lazy" decoding="async" src=${pending ? nothing : this.source} alt=${this.description}
            @load=${(event: Event) => { this.reportIntrinsicDimensions(event); }}
            width=${dimensions?.width ?? nothing} height=${dimensions?.height ?? nothing}
            style=${styleMap(dimensions === undefined ? {} : {
              "--image-width": `${String(dimensions.width)}px`,
              "--image-height": `${String(dimensions.height)}px`,
              "--image-ratio": String(dimensions.width / dimensions.height),
            })} />
        </button>
      </div>
    `;
  }

  static override styles = css`
    :host { display: block; max-width: 100%; min-width: 0; }
    .frame { max-width: 100%; }
    button { font: inherit; color: inherit; background: var(--pi-surface); border: 0; border-radius: 8px; padding: .3em .65em; cursor: pointer; }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .placeholder { box-sizing: border-box; display: grid; align-content: center; justify-items: center; gap: .5em; width: 320px; max-width: 100%; min-height: 110px; padding: 1em; border: 0; border-radius: 8px; background: var(--pi-surface); text-align: center; }
    .placeholder:not(:disabled):hover { background: var(--pi-surface-hover); }
    .placeholder:disabled { cursor: default; }
    code { display: block; max-width: 100%; margin: 0; overflow-wrap: anywhere; color: var(--pi-text-secondary); font-size: .85em; }
    .image-button { display: block; max-width: 100%; padding: 0; border: 0; background: transparent; cursor: zoom-in; }
    [hidden] { display: none !important; }
    img { display: block; max-width: 100%; max-height: var(--pi-image-max-height, none); width: auto; height: auto; object-fit: contain; border-radius: var(--pi-image-radius, 0); }
    /* A definite width plus the declared ratio reserves the final, height-capped
       footprint before lazy loading. CSS still handles narrow viewports. */
    img[width][height] { width: min(var(--image-width), calc(var(--pi-image-max-height, var(--image-height)) * var(--image-ratio))); }
  `;
}
