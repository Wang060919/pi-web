import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { getLocale, t } from "../../../shared/i18n";
import { usageModelAxisTicks, type UsageModelDay, type UsageModelTotal } from "../usageOverview";

const VISIBLE_MODELS = 6;
const modelColor = (index: number): string => `hsl(217 70% ${String(Math.min(88, 58 + index * 7))}%)`;

@customElement("usage-models")
export class UsageModels extends LitElement {
  @property({ attribute: false }) models: readonly UsageModelTotal[] = [];
  @property({ attribute: false }) days: readonly UsageModelDay[] = [];
  @property({ type: Number }) totalTokens = 0;
  @property() locale: string = getLocale();
  @state() private expanded = false;
  @state() private labelCapacity = 2;
  @state() private hoveredDate: string | undefined;
  @state() private focusedDate: string | undefined;
  @state() private pinnedDate: string | undefined;
  @state() private tabDate: string | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private observedPlot: HTMLElement | undefined;

  override disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.observedPlot = undefined;
    super.disconnectedCallback();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }

  protected override updated(): void {
    const plot = this.renderRoot.querySelector<HTMLElement>(".plot") ?? undefined;
    if (plot !== this.observedPlot) {
      this.resizeObserver?.disconnect();
      this.observedPlot = plot;
      this.resizeObserver = plot === undefined ? undefined : new ResizeObserver(this.measureLabels);
      if (plot !== undefined) this.resizeObserver?.observe(plot);
    }
    this.measureLabels();
  }

  private readonly measureLabels = (): void => {
    const plot = this.observedPlot;
    const sample = this.renderRoot.querySelector<HTMLElement>(".label-measure");
    if (plot === undefined || sample === null) return;
    this.labelCapacity = Math.max(2, Math.floor((plot.getBoundingClientRect().width + 8) / (sample.getBoundingClientRect().width + 8)));
  };

  private number(value: number, compact = false): string {
    return new Intl.NumberFormat(this.locale, compact ? { notation: "compact", maximumFractionDigits: 1 } : {}).format(value);
  }

  private date(value: string): string {
    return new Intl.DateTimeFormat(this.locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  }

  private closeTooltip(): void {
    this.hoveredDate = undefined;
    this.focusedDate = undefined;
    this.pinnedDate = undefined;
  }

  private async navigateDay(event: KeyboardEvent, index: number): Promise<void> {
    if (event.key === "Escape") {
      this.closeTooltip();
      return;
    }
    const next = event.key === "Home" ? 0 : event.key === "End" ? this.days.length - 1 : event.key === "ArrowLeft" ? Math.max(0, index - 1) : event.key === "ArrowRight" ? Math.min(this.days.length - 1, index + 1) : undefined;
    const day = next === undefined ? undefined : this.days[next];
    if (day === undefined) return;
    event.preventDefault();
    this.hoveredDate = undefined;
    this.pinnedDate = undefined;
    this.tabDate = day.date;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLButtonElement>(`button[data-date="${day.date}"]`)?.focus();
  }

  override render() {
    if (this.models.length === 0) return html`<p class="empty">${t("ui.usageOverview.emptyModels")}</p>`;
    const ticks = usageModelAxisTicks(Math.max(0, ...this.days.map((day) => day.totalTokens)));
    const top = ticks.at(-1) ?? 1;
    const activeIndex = this.days.findIndex((day) => day.date === (this.hoveredDate ?? this.pinnedDate ?? this.focusedDate));
    const activeDay = this.days[activeIndex];
    const activePosition = (activeIndex + .5) / this.days.length;
    const tabDate = this.days.some((day) => day.date === this.tabDate) ? this.tabDate : this.days.at(-1)?.date;
    const labelStep = Math.max(1, Math.ceil(this.days.length / this.labelCapacity));
    const visibleModels = this.expanded ? this.models : this.models.slice(0, VISIBLE_MODELS);
    return html`
      <div class="chart" role="group" aria-label=${t("ui.usageOverview.modelChart")}>
        <div class="y-axis" aria-hidden="true">${ticks.map((tick) => html`<span>${this.number(tick, true)}</span>`)}</div>
        <div class="plot" @pointerleave=${() => { this.hoveredDate = undefined; }}>
          ${this.days.map((day, index) => html`
            <button class="plot-day" type="button" data-date=${day.date} tabindex=${day.date === tabDate ? 0 : -1}
              aria-label=${`${this.date(day.date)}: ${this.number(day.totalTokens)} ${t("ui.usageOverview.tokens")}`}
              aria-describedby=${activeDay === day ? "model-day-tooltip" : nothing}
              @pointerenter=${(event: PointerEvent) => { if (event.pointerType !== "touch") this.hoveredDate = day.date; }}
              @focus=${() => { this.focusedDate = day.date; this.tabDate = day.date; }}
              @blur=${() => { if (this.focusedDate === day.date) this.focusedDate = undefined; }}
              @click=${() => { if (this.pinnedDate === day.date) this.closeTooltip(); else this.pinnedDate = day.date; }}
              @keydown=${(event: KeyboardEvent) => { void this.navigateDay(event, index); }}
            >${day.segments.map((segment) => html`<span class="segment" aria-hidden="true" style=${`height:${String(segment.totalTokens / top * 100)}%;background:${modelColor(segment.modelIndex)}`}></span>`)}</button>
          `)}
          ${activeDay === undefined ? nothing : html`
            <div id="model-day-tooltip" role="tooltip" class="chart-tooltip" data-edge=${activePosition < .15 ? "start" : activePosition > .85 ? "end" : "middle"} style=${`left:${String(activePosition * 100)}%;bottom:${String(activeDay.totalTokens / top * 100)}%`}>
              <strong>${this.date(activeDay.date)}</strong>
              ${activeDay.segments.map((segment) => html`<div><span class="swatch" style=${`background:${modelColor(segment.modelIndex)}`} aria-hidden="true"></span><span>${segment.model}: ${this.number(segment.totalTokens, true)}</span></div>`)}
            </div>
          `}
        </div>
        <div class="x-axis" aria-hidden="true">
          <span class="measure-wrap"><span class="label-measure">${this.date("2000-09-30")}</span></span>
          ${this.days.map((day, index) => html`<span>${index % labelStep === 0 ? this.date(day.date) : nothing}</span>`)}
        </div>
      </div>
      <ol class="model-legend">${visibleModels.map((model, index) => html`
        <li><span class="swatch" aria-hidden="true" style=${`background:${modelColor(index)}`}></span><span class="model-name" title=${model.model}>${model.model}</span><span class="model-io">${t("ui.usageOverview.modelIO").replace("{input}", this.number(model.input, true)).replace("{output}", this.number(model.output, true))}</span><span class="model-percent">${new Intl.NumberFormat(this.locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(this.totalTokens > 0 ? model.totalTokens / this.totalTokens : 0)}</span></li>
      `)}</ol>
      ${this.models.length <= VISIBLE_MODELS ? nothing : html`<button class="expand" type="button" aria-expanded=${String(this.expanded)} @click=${() => { this.expanded = !this.expanded; }}>${this.expanded ? t("ui.usageOverview.showLess") : t("ui.usageOverview.showMoreModels").replace("{count}", this.number(this.models.length - VISIBLE_MODELS))}</button>`}
    `;
  }

  static override styles = css`
    :host { display: block; min-width: 0; container-type: inline-size; color: var(--pi-text); font: inherit; }
    * { box-sizing: border-box; }
    button { border: 0; font: inherit; color: inherit; cursor: pointer; }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .empty { min-height: 180px; margin: 0; display: grid; place-items: center; text-align: center; color: var(--usage-label); }
    .chart { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; column-gap: 11px; row-gap: 12px; height: 160px; padding: 8px 10px 5px 3px; font-size: 11px; line-height: 1; color: var(--pi-text-secondary, var(--pi-muted)); }
    .y-axis { display: flex; flex-direction: column-reverse; align-items: flex-end; justify-content: space-between; }
    .y-axis span { display: flex; align-items: center; height: 0; white-space: nowrap; }
    .plot { position: relative; display: flex; min-width: 0; min-height: 0; }
    .plot-day { display: flex; flex: 1; flex-direction: column-reverse; align-items: center; min-width: 0; height: 100%; padding: 0; background: transparent; }
    .segment { flex-shrink: 0; width: 72%; }
    .segment:last-child { border-radius: 2px 2px 0 0; }
    .plot-day:hover .segment { filter: brightness(.9); }
    .x-axis { grid-column: 2; display: flex; min-width: 0; }
    .x-axis > span { display: flex; flex: 1; justify-content: center; min-width: 0; white-space: nowrap; }
    .x-axis > .measure-wrap { flex: none; width: 0; visibility: hidden; }
    .label-measure { flex-shrink: 0; }
    .model-legend { display: flex; flex-direction: column; gap: 3px; margin: 5px 0 0; padding: 0; list-style: none; }
    li { display: flex; align-items: center; gap: 4px; min-width: 0; font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; }
    .swatch { flex-shrink: 0; width: 8px; height: 8px; border-radius: 2px; }
    .model-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .model-io { flex-shrink: 0; color: var(--usage-label); }
    .model-percent { flex-shrink: 0; width: 56px; text-align: right; }
    .expand { margin-top: 4px; padding: 2px 0; background: transparent; color: var(--pi-muted); font-size: 12px; }
    .expand:hover { color: var(--pi-text); }
    .chart-tooltip { position: absolute; z-index: 2; width: max-content; max-width: min(240px, 100%); margin-bottom: 4px; padding: 6px 8px; transform: translateX(-50%); border-radius: 6px; background: light-dark(#131313, #252524); color: #efeeeb; font-size: 12px; line-height: 16px; box-shadow: 0 1px 3px #0003, 0 0 0 1px #ffffff14; pointer-events: none; }
    .chart-tooltip[data-edge="start"] { transform: none; }
    .chart-tooltip[data-edge="end"] { transform: translateX(-100%); }
    .chart-tooltip strong { display: block; margin-bottom: 3px; font-weight: var(--pi-font-weight-semibold, 540); }
    .chart-tooltip > div { display: flex; align-items: baseline; gap: 4px; overflow-wrap: anywhere; }
    .chart-tooltip .swatch { width: 6px; height: 6px; border-radius: 50%; }
    @media (max-width: 760px), (pointer: coarse) { .expand { min-height: 44px; } }
    @container (max-width: 340px) {
      li { flex-wrap: wrap; }
      .model-name { flex-basis: calc(100% - 12px); }
      .model-io { margin-left: 12px; }
      .model-percent { margin-left: auto; }
    }
  `;
}
