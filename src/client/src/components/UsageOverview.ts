import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { getLocale, t } from "../../../shared/i18n";
import { aggregateUsageOverview, type DailyUsageRecord, type UsageDay, type UsageOverviewRange } from "../usageOverview";
import "./UsageModels";

@customElement("usage-overview")
export class UsageOverview extends LitElement {
  @property({ attribute: false }) records: readonly DailyUsageRecord[] = [];
  @property() today = new Date().toISOString().slice(0, 10);
  @property() locale: string = getLocale();
  @state() private view: "overview" | "models" = "overview";
  @state() private range: UsageOverviewRange = "all";
  @state() private focusedDate: string | undefined;
  @state() private hoveredDate: string | undefined;
  @state() private pinnedDate: string | undefined;
  @state() private tabDate: string | undefined;

  private number(value: number): string {
    return value.toLocaleString(this.locale);
  }

  private date(value: string, short = false): string {
    return new Intl.DateTimeFormat(this.locale, { year: short ? undefined : "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  }

  private changeRange(range: UsageOverviewRange): void {
    this.range = range;
    this.closeTooltip();
  }

  private closeTooltip(): void {
    this.hoveredDate = undefined;
    this.focusedDate = undefined;
    this.pinnedDate = undefined;
  }

  private async moveFocus(date: string): Promise<void> {
    this.tabDate = date;
    await this.updateComplete;
    this.renderRoot.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)?.focus();
  }

  private navigateDay(event: KeyboardEvent, index: number, days: readonly UsageDay[]): void {
    if (event.key === "Escape") {
      this.closeTooltip();
      return;
    }
    const offsets: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    const offset = offsets[event.key];
    const next = event.key === "Home" ? 0 : event.key === "End" ? days.length - 1 : offset === undefined ? undefined : Math.max(0, Math.min(days.length - 1, index + offset));
    const day = next === undefined ? undefined : days[next];
    if (day === undefined) return;
    event.preventDefault();
    this.pinnedDate = undefined;
    void this.moveFocus(day.date);
  }

  override render() {
    const data = aggregateUsageOverview(this.records, this.range, this.today);
    const availableDays = data.days.filter((day) => !day.future);
    const activeDate = this.hoveredDate ?? this.pinnedDate ?? this.focusedDate;
    const activeIndex = data.days.findIndex((day) => day.date === activeDate);
    const activeDay = data.days[activeIndex];
    const maximum = Math.max(1, ...data.days.map((day) => day.messages));
    const tabDate = data.days.some((day) => day.date === this.tabDate) ? this.tabDate : this.today;
    const metrics = [
      [t("ui.usageOverview.sessions"), this.number(data.sessions)],
      [t("ui.usageOverview.messages"), this.number(data.messages)],
      [t("ui.usageOverview.totalTokens"), this.number(data.totalTokens)],
      [t("ui.usageOverview.activeDays"), this.number(data.activeDays)],
      [t("ui.usageOverview.peakHour"), data.peakHour === undefined ? "—" : `${String(data.peakHour).padStart(2, "0")}:00`],
      [t("ui.usageOverview.favoriteModel"), data.favoriteModel ?? "—"],
    ];
    return html`
      <section class="panel" aria-label=${t("ui.usageOverview.title")} @keydown=${(event: KeyboardEvent) => { if (event.key === "Escape") this.closeTooltip(); }}>
        <header>
          <div class="switch" role="group" aria-label=${t("ui.usageOverview.title")}>
            <button type="button" aria-pressed=${String(this.view === "overview")} @click=${() => { this.view = "overview"; }}>${t("ui.usageOverview.overview")}</button>
            <button type="button" aria-pressed=${String(this.view === "models")} @click=${() => { this.view = "models"; this.closeTooltip(); }}>${t("ui.usageOverview.models")}</button>
          </div>
          <div class="switch" role="group" aria-label=${t("ui.usageOverview.range")}>
            ${([ ["all", "all"], ["30", "days30"], ["7", "days7"] ] as const).map(([range, label]) => html`<button type="button" aria-pressed=${String(this.range === range)} @click=${() => { this.changeRange(range); }}>${t(`ui.usageOverview.${label}`)}</button>`)}
          </div>
        </header>
        ${this.view === "overview" ? html`
          <dl class="metrics">${metrics.map(([label, value], index) => html`<div><dt>${label}</dt><dd class=${index === 5 ? "model-value" : ""} title=${value}>${value}</dd></div>`)}</dl>
          <div class="heatmap-wrap" @pointerleave=${() => { this.hoveredDate = undefined; }}>
            <div class="heatmap-scroll"><div class="heatmap" role="group" aria-label=${t("ui.usageOverview.heatmap")}>
              ${data.days.map((day, index) => html`
                ${day.future ? html`<span class="day future" aria-hidden="true"></span>` : html`<button type="button" class="day" data-date=${day.date} data-level=${day.messages === 0 ? 0 : Math.max(1, Math.ceil(day.messages / maximum * 4))} data-in-range=${String(day.inRange)}
                  tabindex=${day.date === tabDate ? 0 : -1}
                  aria-label=${`${this.date(day.date)}: ${this.number(day.messages)} ${t("ui.usageOverview.messages")}`}
                  aria-describedby=${activeDay === day ? "usage-day-tooltip" : nothing}
                  @pointerenter=${() => { this.hoveredDate = day.date; }}
                  @focus=${() => { this.focusedDate = day.date; this.tabDate = day.date; }}
                  @blur=${() => { if (this.focusedDate === day.date) this.focusedDate = undefined; }}
                  @click=${() => { const close = this.pinnedDate === day.date; this.pinnedDate = close ? undefined : day.date; if (close) this.closeTooltip(); }}
                  @keydown=${(event: KeyboardEvent) => { this.navigateDay(event, index, availableDays); }}
                ></button>`}
              `)}
            </div>
            </div>
            ${activeDay === undefined ? nothing : html`
              <div class="tooltip" id="usage-day-tooltip" role="tooltip" data-edge=${activeIndex < 21 ? "start" : activeIndex >= 161 ? "end" : "middle"} style=${`--column:${String(Math.floor(activeIndex / 7))}; --row:${String(activeIndex % 7)}`}>${this.date(activeDay.date, true)} — ${this.number(activeDay.messages)}</div>
            `}
          </div>
          <div class="legend">
            <span>${t("ui.usageOverview.less")}</span>
            <span class="legend-scale" aria-hidden="true">${[0, 1, 2, 3, 4].map((level) => html`<span class="legend-cell" data-level=${level}></span>`)}</span>
            <span>${t("ui.usageOverview.more")}</span>
          </div>
        ` : html`
          <usage-models .models=${data.models} .days=${data.modelDays} .totalTokens=${data.totalTokens} .locale=${this.locale}></usage-models>
        `}
      </section>
    `;
  }

  static override styles = css`
    :host { display: block; width: 480px; max-width: 100%; color: var(--pi-text, light-dark(#171717, #e5e5e5)); font: var(--pi-font-weight-regular, 360) 12px/16px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); }
    * { box-sizing: border-box; }
    .panel { --usage-surface: light-dark(#f0f0ef, #282828); --usage-cell: light-dark(#dadad9, #3e3e3e); --usage-label: light-dark(#8f8d88, #898781); --usage-level-1: hsl(217 70% 72%); --usage-level-2: hsl(217 70% 64%); --usage-level-3: hsl(217 70% 56%); --usage-level-4: hsl(217 70% 48%); padding: 8px 12px 12px; border: 0; border-radius: 8px; background: var(--usage-surface); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 20px; }
    .switch { display: inline-flex; align-items: center; gap: 1px; }
    button { border: 0; font: inherit; color: inherit; cursor: pointer; }
    .switch button { height: 20px; padding: 0 6px; border-radius: 6px; color: var(--usage-label); background: transparent; white-space: nowrap; }
    .switch button[aria-pressed="true"] { background: light-dark(#e5e5e4, #383838); color: var(--pi-text, light-dark(#171717, #e5e5e5)); }
    .switch button:hover { color: var(--pi-text); }
    button:focus-visible { outline: 2px solid var(--pi-accent, #d97757); outline-offset: 2px; }
    dl { margin: 0; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin-bottom: 6px; }
    .metrics > div { min-width: 0; min-height: 44px; padding: 4px; border-radius: 5px; background: var(--usage-cell); }
    dt { color: var(--usage-label); }
    dd { margin: 0; font-variant-numeric: tabular-nums; }
    .metrics dt, .metrics dd { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .metrics dd { margin-top: 2px; font-size: 13px; line-height: 18px; font-weight: var(--pi-font-weight-semibold, 540); }
    .metrics dd.model-value { font-size: 12px; font-weight: var(--pi-font-weight-regular, 360); }
    .heatmap-wrap { position: relative; }
    .heatmap { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, minmax(0, 1fr)); grid-template-columns: repeat(26, minmax(0, 1fr)); gap: 3px; }
    .day { display: block; width: 100%; min-width: 0; padding: 0; aspect-ratio: 1; border-radius: 2px; background: var(--usage-cell); }
    :is(.day, .legend-cell)[data-level="1"] { background: var(--usage-level-1); }
    :is(.day, .legend-cell)[data-level="2"] { background: var(--usage-level-2); }
    :is(.day, .legend-cell)[data-level="3"] { background: var(--usage-level-3); }
    :is(.day, .legend-cell)[data-level="4"] { background: var(--usage-level-4); }
    .legend { display: flex; align-items: center; gap: 6px; margin-top: 10px; color: var(--usage-label); font-size: 11px; }
    .legend-scale { display: flex; gap: 3px; }
    .legend-cell { width: 11px; height: 11px; border-radius: 2px; background: var(--usage-cell); }
    .day[data-in-range="false"] { opacity: .42; }
    button.day:hover { outline: 1px solid var(--pi-muted, #999); outline-offset: 1px; }
    .future { background: transparent; }
    .tooltip { position: absolute; z-index: 2; width: max-content; max-width: min(240px, 100%); left: calc((var(--column) + .5) * (100% + 3px) / 26 - 1.5px); top: calc(var(--row) * (100% + 3px) / 7 - 4px); transform: translate(-50%, -100%); padding: 2px 8px; border-radius: 6px; background: light-dark(#131313, #252524); color: #efeeeb; font-size: 13px; line-height: 18px; font-weight: var(--pi-font-weight-regular, 360); box-shadow: 0 1px 3px #0003, 0 0 0 1px #ffffff14; pointer-events: none; }
    .tooltip[data-edge="start"] { transform: translate(0, -100%); }
    .tooltip[data-edge="end"] { transform: translate(-100%, -100%); }
    @media (max-width: 760px), (pointer: coarse) {
      header { flex-wrap: wrap; gap: 4px 8px; margin-bottom: 10px; }
      .switch button { min-width: 44px; min-height: 44px; padding-inline: 6px; }
      .metrics dt { white-space: normal; overflow-wrap: anywhere; }
      .metrics > div { min-height: 56px; }
      .tooltip { max-width: 100%; }
    }
    @media (max-width: 360px) { .panel { padding-inline: 9px; } header { gap: 4px; } .switch button { padding-inline: 4px; } }
  `;
}
