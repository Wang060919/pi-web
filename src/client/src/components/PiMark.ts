import { html } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import mark from "../../public/pi-mark.svg?raw";

/** Decorative brand mark; the SVG is a trusted build asset shared with the icon generator. */
export function piMark(size: 16 | 20 | 24 | 32 = 20) {
  return html`<span class="pi-mark" aria-hidden="true" style=${styleMap({
    display: "inline-flex", flex: "none", width: `${String(size)}px`, height: `${String(size)}px`, lineHeight: "0",
  })}>${unsafeSVG(mark)}</span>`;
}
