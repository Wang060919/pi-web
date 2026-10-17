import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { getLocale, t } from "../../../shared/i18n";
import { aggregateUsageOverview, type DailyUsageRecord, type UsageDay, type UsageOverviewRange } from "../usageOverview";

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

  private date(value: string): string {
    return new Intl.DateTimeFormat(this.locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
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
    const activeDate = this.hoveredDate ?? this.pinnedDate ?? this.focusedDate;
    const activeIndex = data.days.findIndex((day) => day.date === activeDate);
    const activeDay = data.days[activeIndex];
    const maximum = Math.max(1, ...data.days.map((day) => day.totalTokens));
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
          <dl class="metrics">${metrics.map(([label, value]) => html`<div><dt>${label}</dt><dd>${value}</dd></div>`)}</dl>
          <div class="heatmap-wrap" @pointerleave=${() => { this.hoveredDate = undefined; }}>
            <div class="heatmap" role="group" aria-label=${t("ui.usageOverview.heatmap")}>
              ${data.days.map((day, index) => html`
                <button type="button" class="day" data-date=${day.date} data-level=${day.totalTokens === 0 ? 0 : Math.max(1, Math.ceil(day.totalTokens / maximum * 4))} data-in-range=${String(day.inRange)}
                  tabindex=${day.date === tabDate ? 0 : -1}
                  aria-label=${`${this.date(day.date)}: ${this.number(day.totalTokens)} ${t("ui.usageOverview.tokens")}`}
                  aria-describedby=${activeDay === day ? "usage-day-tooltip" : nothing}
                  @pointerenter=${() => { this.hoveredDate = day.date; }}
                  @focus=${() => { this.focusedDate = day.date; this.tabDate = day.date; }}
                  @blur=${() => { if (this.focusedDate === day.date) this.focusedDate = undefined; }}
                  @click=${() => { const close = this.pinnedDate === day.date; this.pinnedDate = close ? undefined : day.date; if (close) this.closeTooltip(); }}
                  @keydown=${(event: KeyboardEvent) => { this.navigateDay(event, index, data.days); }}
                ></button>
              `)}
            </div>
            ${activeDay === undefined ? nothing : html`
              <div class="tooltip" id="usage-day-tooltip" role="tooltip" style=${`--column:${String(Math.floor(activeIndex / 7))}; --row:${String(activeIndex % 7)}`}>
                <strong>${this.date(activeDay.date)}</strong>
                <dl>${[
                  [t("ui.usageOverview.totalTokens"), activeDay.totalTokens],
                  [t("ui.usageOverview.input"), activeDay.tokens.input],
                  [t("ui.usageOverview.output"), activeDay.tokens.output],
                  [t("ui.usageOverview.cacheRead"), activeDay.tokens.cacheRead],
                  [t("ui.usageOverview.cacheWrite"), activeDay.tokens.cacheWrite],
                  [t("ui.usageOverview.sessions"), activeDay.sessions],
                ].map(([label, value]) => html`<div><dt>${label}</dt><dd>${this.number(Number(value))}</dd></div>`)}</dl>
              </div>
            `}
          </div>
        ` : html`
          <div class="models">
            ${data.models.length === 0 ? html`<p>${t("ui.usageOverview.emptyModels")}</p>` : html`<ol>${data.models.map((model) => html`
              <li><div class="model-label"><span>${model.model}</span><span>${this.number(model.totalTokens)} ${t("ui.usageOverview.tokens")}</span></div><div class="model-track" aria-hidden="true"><span style=${`width:${String(data.totalTokens > 0 ? model.totalTokens / data.totalTokens * 100 : 0)}%`}></span></div></li>
            `)}</ol>`}
          </div>
        `}
      </section>
    `;
  }

  static override styles = css`
    :host { display: block; width: 480px; max-width: 100%; color: var(--pi-text, light-dark(#171717, #e5e5e5)); font: 400 12px/16px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); }
    * { box-sizing: border-box; }
    .panel { --usage-surface: light-dark(#f0f0ef, var(--pi-surface, #282828)); --usage-cell: light-dark(#dadad9, #3e3e3e); --usage-label: light-dark(#86847f, #898781); padding: 8px 12px 14px; border-radius: 8px; background: var(--usage-surface); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 20px; }
    .switch { display: inline-flex; align-items: center; gap: 1px; }
    button { border: 0; font: inherit; color: inherit; cursor: pointer; }
    .switch button { padding: 2px 6px; border-radius: 5px; color: var(--usage-label); background: transparent; white-space: nowrap; }
    .switch button[aria-pressed="true"] { background: light-dark(#e5e5e4, #383838); color: var(--pi-text, light-dark(#171717, #e5e5e5)); }
    .switch button:hover { color: var(--pi-text); }
    button:focus-visible { outline: 2px solid var(--pi-accent, #d97757); outline-offset: 2px; }
    dl { margin: 0; }
    .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin-bottom: 6px; }
    .metrics > div { min-width: 0; min-height: 44px; padding: 4px; border-radius: 4px; background: var(--usage-cell); }
    dt { color: var(--usage-label); }
    dd { margin: 0; font-variant-numeric: tabular-nums; }
    .metrics dt, .metrics dd { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .metrics dd { margin-top: 2px; font-size: 13px; }
    .heatmap-wrap { position: relative; }
    .heatmap { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, minmax(0, 1fr)); grid-template-columns: repeat(26, minmax(0, 1fr)); gap: 3px; }
    .day { display: block; width: 100%; min-width: 0; padding: 0; aspect-ratio: 1; border-radius: 2px; background: var(--usage-cell); }
    .day[data-level="1"] { background: light-dark(#bcbcbb, #555554); }
    .day[data-level="2"] { background: light-dark(#969695, #747473); }
    .day[data-level="3"] { background: light-dark(#737372, #969695); }
    .day[data-level="4"] { background: light-dark(#50504f, #b7b7b6); }
    .day[data-in-range="false"] { opacity: .42; }
    .day:hover { outline: 1px solid var(--pi-muted, #999); outline-offset: 1px; }
    .tooltip { position: absolute; z-index: 2; width: min(220px, 100%); left: clamp(0px, calc(var(--column) * (100% + 3px) / 26), max(0px, 100% - 220px)); top: calc(var(--row) * (100% + 3px) / 7 - 6px); transform: translateY(-100%); padding: 10px 12px; border-radius: 8px; background: light-dark(#fcfcfc, #303030); box-shadow: 0 4px 20px #0003; pointer-events: none; }
    .tooltip strong { display: block; margin-bottom: 6px; font-weight: 500; }
    .tooltip dl > div { display: flex; justify-content: space-between; gap: 12px; }
    .models { min-height: 215px; }
    .models > p { margin: 0; padding: 70px 8px; text-align: center; color: var(--usage-label); }
    ol { margin: 0; padding: 0; list-style: none; }
    li { padding: 8px 0; }
    .model-label { display: flex; justify-content: space-between; gap: 10px; }
    .model-label > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .model-label > span:last-child { flex-shrink: 0; color: var(--usage-label); font-variant-numeric: tabular-nums; }
    .model-track { height: 4px; margin-top: 5px; border-radius: 2px; background: var(--usage-cell); overflow: hidden; }
    .model-track > span { display: block; height: 100%; background: light-dark(#969695, #969695); border-radius: inherit; }
    @media (max-width: 360px) { .panel { padding-inline: 9px; } header { gap: 4px; } .switch button { padding-inline: 4px; } }
  `;
}
