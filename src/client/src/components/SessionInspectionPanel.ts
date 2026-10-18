import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SessionRef } from "../../../shared/apiTypes";
import type { SessionInspection } from "../../../shared/runtimeInspection";
import { t } from "../../../shared/i18n";
import { runtimeInspectionApi } from "../api/runtimeInspection";
import { sharedSettingsEditorStyles } from "./settings/sharedSettingsEditorStyles";

@customElement("session-inspection-panel")
export class SessionInspectionPanel extends LitElement {
  @property() machineId = "local";
  @property({ attribute: false }) session: SessionRef | undefined;
  @state() private snapshot: SessionInspection | undefined;
  @state() private loading = false;
  @state() private error = "";
  @state() private tab: "prompt" | "tools" = "prompt";
  @state() private query = "";
  private request: AbortController | undefined;
  private targetKey = "";

  protected override willUpdate(): void {
    const key = JSON.stringify([this.machineId, this.session?.id, this.session?.cwd]);
    if (key !== this.targetKey) { this.targetKey = key; this.query = ""; void this.reload(); }
  }
  override disconnectedCallback(): void { this.request?.abort(); this.targetKey = ""; super.disconnectedCallback(); }

  private async reload(): Promise<void> {
    this.request?.abort();
    this.snapshot = undefined; this.error = ""; this.loading = false;
    if (this.session === undefined) return;
    const request = new AbortController(); this.request = request; this.loading = true;
    try {
      const snapshot = await runtimeInspectionApi.session(this.machineId, this.session, request.signal);
      if (!request.signal.aborted) this.snapshot = snapshot;
    } catch (error) { if (!request.signal.aborted) this.error = `${t("inspection.unavailable")} ${error instanceof Error ? error.message : String(error)}`; }
    finally { if (!request.signal.aborted) this.loading = false; }
  }
  override render() {
    const tools = this.snapshot?.tools.filter((tool) => `${tool.name} ${tool.description}`.toLocaleLowerCase().includes(this.query.toLocaleLowerCase())) ?? [];
    return html`
      <p class="note">${t("inspection.runtimeNote")}</p>
      <div class="controls"><div><button type="button" aria-pressed=${String(this.tab === "prompt")} @click=${() => { this.tab = "prompt"; }}>${t("inspection.prompt")}</button><button type="button" aria-pressed=${String(this.tab === "tools")} @click=${() => { this.tab = "tools"; }}>${t("inspection.tools")}${this.snapshot === undefined ? nothing : ` (${String(this.snapshot.tools.length)})`}</button></div><button type="button" ?disabled=${this.loading} @click=${() => { void this.reload(); }}>${t("inspection.refresh")}</button></div>
      ${this.loading ? html`<p role="status">${t("inspection.loading")}</p>` : nothing}
      ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : nothing}
      ${this.snapshot === undefined ? nothing : this.tab === "prompt" ? html`<pre class="prompt" tabindex="0">${this.snapshot.systemPrompt || t("inspection.emptyPrompt")}</pre>` : html`
        <input type="search" aria-label=${t("inspection.searchTools")} placeholder=${t("inspection.searchTools")} .value=${this.query} @input=${(event: Event) => { if (event.target instanceof HTMLInputElement) this.query = event.target.value; }}>
        ${tools.length === 0 ? html`<p class="note">${t("inspection.noTools")}</p>` : nothing}
        ${tools.map((tool) => html`<details><summary>${tool.name}</summary><p>${tool.description}</p><pre tabindex="0">${JSON.stringify(tool.parameters, null, 2)}</pre></details>`)}
      `}`;
  }
  static override styles = [sharedSettingsEditorStyles, css`
    .note { margin: 8px 0; } .controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px; margin: 10px 0; }
    button[aria-pressed="true"] { background: var(--pi-selection-bg); } pre { padding: 12px; background: var(--pi-bg); border-radius: 8px; max-height: 50dvh; overflow: auto; }
    details, input { margin: 10px 0; } details p { margin: 8px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  `];
}
