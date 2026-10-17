import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { t } from "../../../shared/i18n";

interface ThinkingLevelOption { value: string; label: string }
interface LabelTransition { id: number; from: string; direction: "up" | "down" }

/** A decorative rolling label; the parent's slotted text remains its accessible name. */
@customElement("thinking-level-label")
export class ThinkingLevelLabel extends LitElement {
  @property({ attribute: false }) value: string | undefined = undefined;
  @property({ attribute: false }) options: readonly ThinkingLevelOption[] = [];
  @state() private transition: LabelTransition | undefined = undefined;
  private displayed: { value: string | undefined; label: string; known: boolean } | undefined;
  private transitionId = 0;

  protected override willUpdate(): void {
    const index = this.options.findIndex((option) => option.value === this.value);
    const label = this.options[index]?.label ?? this.value ?? t("ui.thinkingPicker.none");
    const previous = this.displayed;
    if (previous !== undefined && previous.value !== this.value) {
      const previousIndex = this.options.findIndex((option) => option.value === previous.value);
      this.transition = previous.known && previousIndex >= 0 && index >= 0 && previousIndex !== index
        ? { id: ++this.transitionId, from: previous.label, direction: index > previousIndex ? "up" : "down" }
        : undefined;
    } else if (previous?.label !== label) {
      // Translations and newly available options do not imply an effort change.
      this.transition = undefined;
    }
    this.displayed = { value: this.value, label, known: index >= 0 };
  }

  override disconnectedCallback(): void {
    // Reconnecting an existing label must not replay a half-finished transition.
    this.transition = undefined;
    super.disconnectedCallback();
  }

  private finishTransition(event: Event, id: number): void {
    if (event.target === event.currentTarget && this.transition?.id === id) this.transition = undefined;
  }

  override render() {
    const label = this.displayed?.label ?? this.value ?? t("ui.thinkingPicker.none");
    const transition = this.transition;
    return html`
      <span class="accessible"><slot></slot></span>
      <span class="width-reserve" aria-hidden="true">${this.options.map((option) => html`<span>${option.label}</span>`)}<span>${label}</span></span>
      <span class="visual" aria-hidden="true" data-direction=${transition?.direction ?? nothing}>
        ${keyed(transition?.id ?? 0, html`
          ${transition === undefined ? nothing : html`<span class="layer outgoing">${transition.from}</span>`}
          <span class=${transition === undefined ? "layer current" : "layer current incoming"} @animationend=${(event: Event) => { if (transition !== undefined) this.finishTransition(event, transition.id); }}>${label}</span>
        `)}
      </span>
    `;
  }

  static override styles = css`
    :host { display: inline-grid; position: relative; height: 1.3em; line-height: 1.3; vertical-align: bottom; }
    .accessible { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .width-reserve, .visual { grid-area: 1 / 1; white-space: nowrap; }
    .width-reserve { display: grid; visibility: hidden; pointer-events: none; }
    .width-reserve > span { grid-area: 1 / 1; }
    .visual { position: relative; overflow: hidden; }
    .layer { position: absolute; inset: 0; }
    [data-direction="up"] .outgoing { animation: label-exit-up 160ms ease-in-out both; }
    [data-direction="up"] .incoming { animation: label-enter-up 160ms ease-in-out both; }
    [data-direction="down"] .outgoing { animation: label-exit-down 160ms ease-in-out both; }
    [data-direction="down"] .incoming { animation: label-enter-down 160ms ease-in-out both; }
    @keyframes label-exit-up { to { transform: translateY(-100%); } }
    @keyframes label-enter-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes label-exit-down { to { transform: translateY(100%); } }
    @keyframes label-enter-down { from { transform: translateY(-100%); } to { transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) {
      .outgoing { display: none; }
      .incoming { animation: none !important; }
    }
  `;
}
