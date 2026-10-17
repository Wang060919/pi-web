import { LitElement, css, html, svg } from "lit";
import { customElement, state } from "lit/decorators.js";
import { getLocale, initializeLocale, t } from "../../../shared/i18n";
import { piMark } from "../components/PiMark";
import "../components/UsageOverview";
import { themePackPlugin } from "../plugins/themes";
import { applyPiWebTheme } from "../theme";
import type { DailyUsageRecord } from "../usageOverview";

// This isolated entry renders the real component with synthetic data only.
// Theme switches apply to this document without saving the app's preferences.
initializeLocale();
const signal = new AbortController().signal;
const themePack = await themePackPlugin.activate({ apiVersion: 4, pluginId: "themes", runtimePluginId: "themes", html, svg, signal, lifetimeSignal: signal });
const themes = themePack.contributions.themes ?? [];
const today = new Date().toISOString().slice(0, 10);

function applyPreviewTheme(mode: "dark" | "light") {
  const theme = themes.find((candidate) => candidate.id === `pi-web-${mode}`);
  if (theme === undefined) throw new Error(`Preview theme is unavailable: ${mode}`);
  applyPiWebTheme({ ...theme, id: `themes:${theme.id}`, pluginId: "themes", localId: theme.id });
}

function demoRecords(): DailyUsageRecord[] {
  const records: DailyUsageRecord[] = [];
  for (let offset = 0; offset < 182; offset += 1) {
    if (offset % 9 > 5) continue;
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    const amount = (1 + (offset * 17) % 31) * 1100;
    const sessions = 1 + offset % 3;
    const messages = sessions * (3 + offset % 5);
    const hourCounts = Array.from({ length: 24 }, (_, hour) => hour === 14 + offset % 6 ? messages : 0);
    records.push({
      date: date.toISOString().slice(0, 10),
      model: offset % 3 === 0 ? "Pi Demo Fast" : "Pi Demo Reasoner",
      sessions,
      messages,
      tokens: { input: amount, output: Math.round(amount * .24), cacheRead: Math.round(amount * .55), cacheWrite: Math.round(amount * .08) },
      hourCounts,
    });
  }
  return records;
}

const sampleRecords = demoRecords();
applyPreviewTheme("dark");

@customElement("usage-overview-preview")
export class UsageOverviewPreview extends LitElement {
  @state() private mode: "dark" | "light" = "dark";
  @state() private demo = false;

  private changeTheme(mode: "dark" | "light") {
    this.mode = mode;
    applyPreviewTheme(mode);
  }

  override render() {
    return html`
      <main>
        <h1>${piMark(24)}<span>${t("ui.welcome.title")}</span></h1>
        <usage-overview .records=${this.demo ? sampleRecords : []} .today=${today} .locale=${getLocale()}></usage-overview>
      </main>
      <aside aria-label="预览设置">
        <div class="settings-row">
          <span class="preview-label">界面预览</span>
          <div class="controls" role="group" aria-label="预览主题">
            <button type="button" aria-pressed=${this.mode === "dark"} @click=${() => { this.changeTheme("dark"); }}>深色</button>
            <button type="button" aria-pressed=${this.mode === "light"} @click=${() => { this.changeTheme("light"); }}>浅色</button>
          </div>
          <div class="controls" role="group" aria-label="预览数据">
            <button type="button" aria-pressed=${!this.demo} @click=${() => { this.demo = false; }}>空状态</button>
            <button type="button" aria-pressed=${this.demo} @click=${() => { this.demo = true; }}>演示数据</button>
          </div>
        </div>
        <p>${this.demo ? "当前显示演示数据，仅用于预览热度和交互。" : "空状态预览 · 尚未连接真实用量数据。"}</p>
      </aside>
    `;
  }

  static override styles = css`
    :host { display: block; min-height: 100dvh; color: var(--pi-text); font: 400 13px/18px var(--pi-font-family); }
    main { box-sizing: border-box; padding: 28px 38px 132px; }
    h1 { display: flex; align-items: center; gap: 8px; margin: 0 0 44px -10px; font-size: 20px; line-height: 28px; font-weight: 400; letter-spacing: -.02em; }
    .pi-mark { color: var(--pi-text); }
    usage-overview { max-width: 100%; }
    aside { position: fixed; bottom: 18px; left: 28px; max-width: calc(100vw - 56px); box-sizing: border-box; padding: 10px 12px; border: 0; border-radius: 10px; background: var(--pi-surface); color: var(--pi-muted); }
    .settings-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .preview-label { font-size: 11px; }
    .controls { display: flex; padding: 2px; gap: 2px; border-radius: 6px; background: color-mix(in srgb, var(--pi-text) 4%, transparent); }
    button { border: 0; padding: 4px 8px; border-radius: 4px; background: transparent; color: var(--pi-muted); font: 400 12px/18px var(--pi-control-font-family); cursor: pointer; }
    button[aria-pressed=true] { background: var(--pi-selection-bg); color: var(--pi-text); }
    button:hover { color: var(--pi-text); }
    button:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    p { margin: 8px 0 0; color: var(--pi-dim); font-size: 11px; line-height: 16px; }
    @media (max-width: 540px) {
      main { padding: 28px 20px 150px; }
      h1 { margin-left: 0; margin-bottom: 34px; font-size: 20px; }
      aside { left: 12px; bottom: 12px; max-width: calc(100vw - 24px); }
      .settings-row { gap: 8px; }
    }
  `;
}
