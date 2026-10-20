import { settingsDesignStyles } from "./settingsDesignStyles";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../../../shared/i18n";
import type { SkillCatalog, SkillCatalogEntry, SkillDocument } from "../../../../shared/runtimeInspection";
import { runtimeInspectionApi } from "../../api/runtimeInspection";
import { sharedSettingsEditorStyles } from "./sharedSettingsEditorStyles";
import "../FormattedText";

@customElement("settings-skills-panel")
export class SettingsSkillsPanel extends LitElement {
  @property() machineId = "local";
  @property() projectId: string | undefined;
  @property() workspaceId: string | undefined;
  @state() private catalog: SkillCatalog | undefined;
  @state() private selected: SkillCatalogEntry | undefined;
  @state() private document: SkillDocument | undefined;
  @state() private query = "";
  @state() private loading = false;
  @state() private reading = false;
  @state() private error = "";
  @state() private documentError = "";
  @state() private raw = false;
  private targetKey = "";
  private catalogRequest: AbortController | undefined;
  private documentRequest: AbortController | undefined;

  protected override willUpdate(): void {
    const key = JSON.stringify([this.machineId, this.projectId, this.workspaceId]);
    if (key !== this.targetKey) { this.targetKey = key; this.query = ""; void this.reload(); }
  }
  override disconnectedCallback(): void {
    this.catalogRequest?.abort(); this.documentRequest?.abort(); this.targetKey = "";
    super.disconnectedCallback();
  }
  private target() { return { projectId: this.projectId, workspaceId: this.workspaceId }; }

  private async reload(): Promise<void> {
    this.catalogRequest?.abort(); this.documentRequest?.abort();
    const request = new AbortController(); this.catalogRequest = request;
    this.catalog = undefined; this.selected = undefined; this.document = undefined;
    this.error = ""; this.documentError = ""; this.loading = true; this.reading = false;
    try {
      const catalog = await runtimeInspectionApi.skills(this.machineId, this.target(), request.signal);
      if (!request.signal.aborted) this.catalog = catalog;
    } catch (error) { if (!request.signal.aborted) this.error = message(error); }
    finally { if (!request.signal.aborted) this.loading = false; }
  }

  private async open(skill: SkillCatalogEntry, path?: string): Promise<void> {
    this.documentRequest?.abort();
    const request = new AbortController(); this.documentRequest = request;
    this.selected = skill; this.document = undefined; this.documentError = ""; this.reading = true;
    try {
      const document = await runtimeInspectionApi.document(this.machineId, this.target(), skill.id, request.signal, path);
      if (!request.signal.aborted) this.document = document;
    } catch (error) { if (!request.signal.aborted) this.documentError = message(error); }
    finally { if (!request.signal.aborted) this.reading = false; }
  }

  private readonly followDocumentLink = (event: MouseEvent): void => {
    const anchor = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    const href = anchor?.getAttribute("data-document-path");
    if (href === undefined || href === null) return;
    event.preventDefault();
    if (this.selected === undefined || this.document === undefined) return;
    try {
      // Resolve relative documents inside the selected skill; the server
      // independently enforces the real filesystem boundary on every read.
      const documentPath = decodeURIComponent(href.split(/[?#]/, 1)[0] ?? "");
      const path = [...this.document.path.split("/").slice(0, -1), documentPath].join("/");
      if (href.startsWith("/") || !/\.md$/i.test(path)) throw new Error(t("inspection.markdownOnly"));
      void this.open(this.selected, path);
    } catch (error) { this.documentError = message(error); }
  };

  override render() {
    const needle = this.query.trim().toLocaleLowerCase();
    const skills = this.catalog?.skills.filter((skill) => `${skill.name} ${skill.description} ${skill.path}`.toLocaleLowerCase().includes(needle)) ?? [];
    return html`
      <header><h2>${t("inspection.skills")}</h2><button type="button" ?disabled=${this.loading} @click=${() => { void this.reload(); }}>${t("inspection.refresh")}</button></header>
      <p class="note">${t("inspection.skillsNote")}</p>
      ${this.projectId !== undefined && this.catalog?.projectTrusted === false ? html`<p class="note">${t("inspection.untrusted")}</p>` : nothing}
      ${this.error ? html`<p role="alert" class="error">${this.error}</p>` : nothing}
      ${this.loading ? html`<p role="status">${t("inspection.loading")}</p>` : nothing}
      ${this.catalog?.diagnostics.map((diagnostic) => html`<p class="note">${diagnostic}</p>`)}
      <input type="search" aria-label=${t("inspection.searchSkills")} placeholder=${t("inspection.searchSkills")} .value=${this.query} @input=${(event: Event) => { if (event.target instanceof HTMLInputElement) this.query = event.target.value; }}>
      <div class="browser">
        <nav aria-label=${t("inspection.skills")}>
          ${!this.loading && this.catalog !== undefined && skills.length === 0 ? html`<p class="note">${t("inspection.noSkills")}</p>` : nothing}
          ${skills.map((skill) => html`<button type="button" class="skill" aria-pressed=${String(skill.id === this.selected?.id)} @click=${() => { void this.open(skill); }}><strong>${skill.name}</strong><small>${t(skill.scope === "project" ? "inspection.project" : "inspection.global")} · ${skill.modelInvocation ? t("inspection.automatic") : t("inspection.manual")}</small></button>`)}
        </nav>
        <section class="detail" aria-label=${t("inspection.skillContent")} aria-busy=${String(this.reading)}>
          ${this.selected === undefined ? html`<p class="note">${t("inspection.selectSkill")}</p>` : html`
            <h3>${this.selected.name}</h3><p>${this.selected.description}</p><p class="path">${this.selected.path}</p><p class="path">${t("inspection.source")}: ${this.selected.source}</p>
            <div class="controls"><button type="button" @click=${() => { if (this.selected !== undefined) void this.open(this.selected); }}>${t("inspection.skillHome")}</button><button type="button" aria-pressed=${String(this.raw)} @click=${() => { this.raw = !this.raw; }}>${this.raw ? t("inspection.preview") : t("inspection.raw")}</button></div>
            ${this.reading ? html`<p role="status">${t("inspection.loading")}</p>` : nothing}
            ${this.documentError ? html`<p role="alert" class="error">${this.documentError}</p>` : nothing}
            ${this.document === undefined ? nothing : html`<p class="path">${this.document.path}</p>${this.raw ? html`<pre>${this.document.content}</pre>` : html`<formatted-text .text=${this.document.content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")} .imagesEnabled=${false} .documentLinks=${true} @click=${this.followDocumentLink}></formatted-text>`}`}
          `}
        </section>
      </div>`;
  }

  static override styles = [sharedSettingsEditorStyles, css`
    header, .controls { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .note { margin: 10px 0; } input { margin: 12px 0; }
    .browser { display: grid; grid-template-columns: minmax(130px, 28%) minmax(0, 1fr); gap: 16px; }
    nav { min-width: 0; max-height: 58dvh; overflow: auto; }
    .skill { display: grid; gap: 4px; width: 100%; text-align: left; overflow-wrap: anywhere; margin-bottom: 4px; }
    .skill[aria-pressed="true"] { background: var(--pi-selection-bg); }
    .detail { min-width: 0; } .detail > * + * { margin-top: 10px; }
    .path { overflow-wrap: anywhere; font: var(--pi-font-weight-regular, 360) 12px/18px var(--pi-font-monospace); color: var(--pi-muted); }
    pre { padding: 12px; background: var(--pi-bg); border-radius: 8px; }
    @media (max-width: 640px) { .browser { grid-template-columns: minmax(0, 1fr); } nav { max-height: 180px; } }
  `, settingsDesignStyles];
}
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
