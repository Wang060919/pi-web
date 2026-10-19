import { renderUiIcon } from "../components/uiIcons";
import { LitElement, css, html } from "lit";
import { state } from "lit/decorators.js";
import { getLocale } from "../../../shared/i18n";
import { request } from "../api/http";
import { resolveAppUrl } from "../appUrl";

interface DemoSession {
  id: string;
  name: string;
  url: string;
}

function copy(chinese: string, english: string): string {
  return getLocale() === "zh-CN" ? chinese : english;
}

function demoSessionUrl(reference: string, appBaseUrl: string): string {
  const base = new URL(appBaseUrl);
  const url = new URL(reference, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.username !== "" || url.password !== "") {
    throw new Error(copy("示例会话链接不属于当前应用。", "The example session link is outside this application."));
  }
  return url.toString();
}

export function parseDevelopmentDemoSessions(value: unknown, appBaseUrl = resolveAppUrl("")): DemoSession[] {
  if (typeof value !== "object" || value === null || !("sessions" in value) || !Array.isArray(value.sessions)) {
    throw new Error(copy("示例数据响应格式无效。", "The example data response is invalid."));
  }
  const sessions = value.sessions.map((session: unknown) => {
    if (typeof session !== "object" || session === null
      || !("id" in session) || typeof session.id !== "string"
      || !("name" in session) || typeof session.name !== "string"
      || !("url" in session) || typeof session.url !== "string") {
      throw new Error(copy("示例会话格式无效。", "An example session is invalid."));
    }
    return { id: session.id, name: session.name, url: demoSessionUrl(session.url, appBaseUrl) };
  });
  if (sessions.length === 0) throw new Error(copy("没有可展示的示例会话。", "No example sessions are available."));
  return sessions;
}

class DevelopmentDemoLauncher extends LitElement {
  @state() private sessions: DemoSession[] = [];
  @state() private loading = false;
  @state() private error = "";

  private openDialog(): void {
    this.requestUpdate();
    this.renderRoot.querySelector("dialog")?.showModal();
  }

  private closeDialog(): void {
    this.renderRoot.querySelector("dialog")?.close();
  }

  private async loadExamples(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.error = "";
    try {
      this.sessions = await request("api/dev-demo", parseDevelopmentDemoSessions, { method: "POST", body: "{}" });
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.loading = false;
    }
  }

  override render() {
    const welcome = this.sessions[0];
    return html`
      <button class="launcher" type="button" @click=${() => { this.openDialog(); }}>
        ${copy("测试数据", "Test data")}
      </button>
      <dialog aria-labelledby="demo-title" aria-describedby="demo-description">
        <header>
          <h2 id="demo-title">${copy("测试数据展示", "Example data")}</h2>
          <button class="close" type="button" aria-label=${copy("关闭", "Close")} @click=${() => { this.closeDialog(); }}>${renderUiIcon("close")}</button>
        </header>
        <p id="demo-description">${copy("载入预设会话，查看对话、代码和工具调用等展示效果。载入数据不会调用真实模型。", "Load preset sessions to explore conversations, code, and tool calls. Loading examples does not call a real model.")}</p>
        <p class="hint">${copy("仅用于当前隔离测试版，可重复载入。", "Available only in this isolated development instance. Examples can be loaded again.")}</p>
        <div class="actions">
          <button class="primary" type="button" ?disabled=${this.loading} @click=${() => { void this.loadExamples(); }}>
            ${this.loading ? copy("正在载入…", "Loading…") : copy("载入示例数据", "Load example data")}
          </button>
          ${welcome === undefined ? null : html`<a class="welcome" href=${welcome.url}>${copy("打开欢迎会话", "Open welcome session")} →</a>`}
        </div>
        <p class="status" role="status" aria-live="polite">${this.loading ? copy("正在准备示例会话…", "Preparing example sessions…") : welcome === undefined ? "" : copy("示例数据已就绪，选择场景即可查看。", "Examples are ready. Choose a scenario to view.")}</p>
        ${this.error === "" ? null : html`<p class="error" role="alert">${copy("载入失败：", "Unable to load: ")}${this.error}</p>`}
        ${welcome === undefined ? null : html`
          <nav aria-label=${copy("示例场景", "Example scenarios")}>
            <h3>${copy("示例场景", "Example scenarios")}</h3>
            <ul>${this.sessions.map((session) => html`<li><a href=${session.url}>${session.name}<span aria-hidden="true">${renderUiIcon("arrowRight")}</span></a></li>`)}</ul>
          </nav>
        `}
      </dialog>
    `;
  }

  static override styles = css`
    :host { position: fixed; left: 16px; bottom: 16px; z-index: 80; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/1.5 var(--pi-font-family, system-ui, sans-serif); }
    button, a { -webkit-tap-highlight-color: transparent; }
    button { cursor: pointer; font: inherit; }
    button:focus-visible, a:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 3px; }
    .launcher { padding: 5px 11px; border: 1px solid var(--pi-border); border-radius: 18px; background: var(--pi-surface); color: var(--pi-muted); box-shadow: 0 2px 10px #0001; font-size: 11px; }
    .launcher:hover { color: var(--pi-text); border-color: var(--pi-accent); }
    dialog { box-sizing: border-box; width: min(460px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); padding: 22px; overflow: auto; border: 1px solid var(--pi-border); border-radius: 14px; background: var(--pi-surface); color: var(--pi-text); font: inherit; box-shadow: 0 16px 64px #0004; }
    dialog::backdrop { background: #0006; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    h2 { margin: 0; font-size: 17px; line-height: 1.5; font-weight: var(--pi-font-weight-semibold, 540); }
    .close { width: 28px; height: 28px; flex: none; border: 0; border-radius: 6px; background: transparent; color: var(--pi-muted); font-size: 22px; line-height: 1; }
    .close:hover { background: var(--pi-selection-bg); color: var(--pi-text); }
    p { margin: 16px 0 0; }
    .hint { margin-top: 8px; color: var(--pi-muted); font-size: 12px; }
    .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
    .primary { border: 1px solid var(--pi-accent); border-radius: 7px; padding: 7px 12px; background: var(--pi-selection-bg); color: var(--pi-text); }
    .primary:hover { border-color: var(--pi-text); }
    .primary:disabled { opacity: .6; cursor: wait; }
    .welcome { color: var(--pi-accent); text-decoration: none; }
    .welcome:hover { text-decoration: underline; }
    .status { color: var(--pi-muted); font-size: 12px; }
    .status:empty { display: none; }
    .error { color: var(--pi-danger, #c94444); overflow-wrap: anywhere; }
    h3 { margin: 20px 0 8px; font-size: 12px; font-weight: var(--pi-font-weight-medium, 460); color: var(--pi-muted); }
    ul { list-style: none; margin: 0; padding: 0; border: 1px solid var(--pi-border); border-radius: 8px; overflow: hidden; }
    li + li { border-top: 1px solid var(--pi-border); }
    li a { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 12px; color: var(--pi-text); text-decoration: none; overflow-wrap: anywhere; }
    li a:hover { background: var(--pi-selection-bg); }
    li span { color: var(--pi-muted); }
    @media (max-width: 540px) {
      :host { left: 10px; bottom: max(10px, env(safe-area-inset-bottom)); }
      dialog { padding: 18px; }
    }
  `;
}

export function mountDevelopmentDemoLauncher(): void {
  const tag = "development-demo-launcher";
  if (customElements.get(tag) === undefined) customElements.define(tag, DevelopmentDemoLauncher);
  if (document.querySelector(tag) === null) document.body.append(document.createElement(tag));
}
