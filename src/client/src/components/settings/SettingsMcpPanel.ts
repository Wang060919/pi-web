import { settingsDesignStyles } from "./settingsDesignStyles";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../../../shared/i18n";
import { isMcpRecord, MCP_REDACTED_VALUE, type McpConfigScope, type McpLoginFlow, type McpManagedServer, type McpManagementSnapshot, type McpManagementTarget, type McpProbeResult } from "../../../../shared/mcpManagement";
import { mcpManagementApi } from "../../api/mcpManagement";
import { sharedSettingsEditorStyles } from "./sharedSettingsEditorStyles";

@customElement("settings-mcp-panel")
export class SettingsMcpPanel extends LitElement {
  @property() machineId = "local";
  @property() projectId: string | undefined;
  @property() workspaceId: string | undefined;
  @state() private snapshot: McpManagementSnapshot | undefined;
  @state() private busy = "";
  @state() private error = "";
  @state() private editing = false;
  @state() private editingExisting = false;
  @state() private draftName = "";
  @state() private draftScope: McpConfigScope = "global";
  @state() private draftConfig = "";
  @state() private probes = new Map<string, McpProbeResult>();
  @state() private flow: McpLoginFlow | undefined;
  @state() private redirectUrl = "";
  private targetKey = "";
  private generation = 0;
  private polling: ReturnType<typeof setTimeout> | undefined;
  private flowTarget: { machineId: string; target: McpManagementTarget } | undefined;

  get hasUnsavedChanges(): boolean { return this.editing; }

  private target(): McpManagementTarget { return { projectId: this.projectId, workspaceId: this.workspaceId }; }

  protected override updated(): void {
    const key = JSON.stringify([this.machineId, this.projectId, this.workspaceId]);
    if (key !== this.targetKey) {
      this.abandonLogin();
      this.targetKey = key;
      this.generation += 1;
      clearTimeout(this.polling);
      this.snapshot = undefined;
      this.flow = undefined;
      this.editing = false;
      this.probes = new Map();
      this.error = "";
      void this.reload();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.polling);
    this.generation += 1;
    this.targetKey = "";
    this.abandonLogin();
  }

  private abandonLogin(): void {
    const flow = this.flow;
    const owner = this.flowTarget;
    if (flow !== undefined && owner !== undefined && (flow.state === "starting" || flow.state === "waiting")) {
      void mcpManagementApi.cancelLogin(owner.machineId, owner.target, flow.id).catch(() => { /* The server also expires disconnected browser flows. */ });
    }
    this.flowTarget = undefined;
  }

  private async run(operation: () => Promise<void>): Promise<void> {
    if (this.busy !== "") return;
    const generation = this.generation;
    this.busy = "working";
    this.error = "";
    try { await operation(); } catch (error) { if (generation === this.generation) this.error = errorMessage(error); }
    finally { if (generation === this.generation) this.busy = ""; }
  }

  private async reload(): Promise<void> {
    const generation = this.generation;
    const machineId = this.machineId;
    const target = this.target();
    this.busy = "loading";
    this.error = "";
    try {
      const snapshot = await mcpManagementApi.list(machineId, target);
      if (generation === this.generation) this.snapshot = snapshot;
    } catch (error) { if (generation === this.generation) this.error = errorMessage(error); }
    finally { if (generation === this.generation) this.busy = ""; }
  }

  private edit(server?: McpManagedServer): void {
    this.error = "";
    this.editing = true;
    this.editingExisting = server !== undefined;
    this.draftName = server?.name ?? "";
    this.draftScope = server?.scope ?? "global";
    this.draftConfig = JSON.stringify(server?.config ?? { command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "."] }, null, 2);
  }

  private revision(scope: McpConfigScope): string { return this.snapshot?.revisions[scope] ?? ""; }

  private async save(): Promise<void> {
    const generation = this.generation;
    await this.run(async () => {
      let config: unknown;
      try { config = JSON.parse(this.draftConfig); } catch { throw new Error(t("mcp.configObject")); }
      if (!isMcpRecord(config)) throw new Error(t("mcp.configObject"));
      const snapshot = await mcpManagementApi.save(this.machineId, this.target(), this.draftName.trim(), { scope: this.draftScope, config, revision: this.revision(this.draftScope) });
      if (generation === this.generation) { this.snapshot = snapshot; this.editing = false; this.probes = new Map(); }
    });
  }

  private async toggle(server: McpManagedServer): Promise<void> {
    const generation = this.generation;
    await this.run(async () => {
      const snapshot = await mcpManagementApi.save(this.machineId, this.target(), server.name, { scope: server.scope, config: { ...server.config, enabled: !server.enabled }, revision: server.revision });
      if (generation === this.generation) { this.snapshot = snapshot; this.probes = new Map(); }
    });
  }

  private async deleteServer(server: McpManagedServer): Promise<void> {
    if (!window.confirm(`${t("mcp.confirmDelete")} ${server.name}?`)) return;
    const generation = this.generation;
    await this.run(async () => {
      const snapshot = await mcpManagementApi.remove(this.machineId, this.target(), server.name, server.scope, server.revision);
      if (generation === this.generation) { this.snapshot = snapshot; this.probes = new Map(); }
    });
  }

  private async test(server: McpManagedServer): Promise<void> {
    const generation = this.generation;
    await this.run(async () => {
      const result = await mcpManagementApi.test(this.machineId, this.target(), server.name, server.scope);
      if (generation === this.generation) this.probes = new Map(this.probes).set(`${server.scope}:${server.name}`, result);
    });
  }

  private async login(server: McpManagedServer): Promise<void> {
    const generation = this.generation;
    const owner = { machineId: this.machineId, target: this.target() };
    await this.run(async () => {
      const flow = await mcpManagementApi.login(owner.machineId, owner.target, server.name, server.scope);
      if (generation !== this.generation) { await mcpManagementApi.cancelLogin(owner.machineId, owner.target, flow.id); return; }
      this.flowTarget = owner;
      this.flow = flow;
      this.redirectUrl = "";
      this.pollLogin();
    });
  }

  private pollLogin(): void {
    clearTimeout(this.polling);
    if (this.flow === undefined || (this.flow.state !== "starting" && this.flow.state !== "waiting")) return;
    const generation = this.generation;
    const flowId = this.flow.id;
    const machineId = this.machineId;
    const target = this.target();
    this.polling = setTimeout(() => {
      void mcpManagementApi.loginStatus(machineId, target, flowId).then((flow) => {
        if (generation === this.generation && this.flow?.id === flowId) { this.flow = flow; this.pollLogin(); }
      }).catch((error: unknown) => { if (generation === this.generation) this.error = errorMessage(error); });
    }, 1000);
  }

  private async cancelLogin(): Promise<void> {
    const flow = this.flow;
    if (flow === undefined) return;
    const generation = this.generation;
    await this.run(async () => {
      const result = await mcpManagementApi.cancelLogin(this.machineId, this.target(), flow.id);
      if (generation === this.generation) { this.flow = result; clearTimeout(this.polling); }
    });
  }

  private async submitRedirect(): Promise<void> {
    const flow = this.flow;
    if (flow === undefined) return;
    const generation = this.generation;
    await this.run(async () => { await mcpManagementApi.submitRedirect(this.machineId, this.target(), flow.id, this.redirectUrl); if (generation === this.generation) this.redirectUrl = ""; });
  }

  private async logout(server: McpManagedServer): Promise<void> {
    const generation = this.generation;
    await this.run(async () => { await mcpManagementApi.logout(this.machineId, this.target(), server.name, server.scope); if (generation === this.generation) this.probes = new Map(); });
  }

  private renderServer(server: McpManagedServer) {
    const result = this.probes.get(`${server.scope}:${server.name}`);
    const http = server.config["url"] !== undefined;
    const headers = server.config["headers"];
    const oauth = http && server.config["auth"] === undefined && (!isMcpRecord(headers) || !Object.keys(headers).some((key) => key.toLowerCase() === "authorization"));
    const disabled = this.busy !== "";
    return html`<article class="server">
      <header><strong>${server.name}</strong><span>${t(`mcp.scope.${server.scope}`)}</span><span class="badge">${t(server.enabled ? "mcp.configEnabled" : "mcp.configDisabled")}</span>${server.overridden ? html`<span>${t("mcp.overridden")}</span>` : nothing}</header>
      <code class="source">${server.source}</code>
      <div class="actions">
        <button ?disabled=${disabled} @click=${() => { this.edit(server); }}>${t("mcp.edit")}</button>
        <button ?disabled=${disabled} @click=${() => { void this.toggle(server); }}>${t(server.enabled ? "mcp.disable" : "mcp.enable")}</button>
        <button ?disabled=${disabled || (this.snapshot?.hasProject === true && !this.snapshot.projectTrusted)} @click=${() => { void this.test(server); }}>${t("mcp.test")}</button>
        ${oauth ? html`<button ?disabled=${disabled || this.flow?.state === "starting" || this.flow?.state === "waiting" || (this.snapshot?.hasProject === true && !this.snapshot.projectTrusted)} @click=${() => { void this.login(server); }}>${t("mcp.signIn")}</button><button ?disabled=${disabled} @click=${() => { void this.logout(server); }}>${t("mcp.signOut")}</button>` : nothing}
        <button class="danger" ?disabled=${disabled} @click=${() => { void this.deleteServer(server); }}>${t("mcp.delete")}</button>
      </div>
      ${result === undefined ? html`<p class="muted">${t("mcp.notTested")}</p>` : html`<p role="status">${t("mcp.lastProbe")}: ${t(`mcp.probe.${result.state}`)} · ${new Date(result.checkedAt).toLocaleTimeString()}</p>
        ${result.tools.length === 0 ? nothing : html`<details><summary>${t("mcp.tools")} (${String(result.tools.length)})</summary>${result.tools.map((tool) => html`<details class="tool"><summary>${tool.name}</summary><p>${tool.description ?? ""}</p><pre>${JSON.stringify(tool.inputSchema ?? {}, null, 2)}</pre></details>`)}</details>`}`}
    </article>`;
  }

  private renderEditor() {
    if (!this.editing) return nothing;
    return html`<form class="editor" @submit=${(event: SubmitEvent) => { event.preventDefault(); void this.save(); }}>
      <label>${t("mcp.name")}<input required pattern="[A-Za-z0-9_-]+" maxlength="128" .value=${this.draftName} ?disabled=${this.editingExisting || this.busy !== ""} @input=${(event: Event) => { if (event.target instanceof HTMLInputElement) this.draftName = event.target.value; }}></label>
      <label>${t("mcp.scope")}<select .value=${this.draftScope} ?disabled=${this.editingExisting || this.busy !== ""} @change=${(event: Event) => { if (event.target instanceof HTMLSelectElement && (event.target.value === "global" || event.target.value === "project")) this.draftScope = event.target.value; }}><option value="global">${t("mcp.scope.global")}</option><option value="project" ?disabled=${this.snapshot?.projectTrusted !== true}>${t("mcp.scope.project")}</option></select></label>
      <label class="wide">${t("mcp.configuration")}<textarea rows="12" spellcheck="false" required .value=${this.draftConfig} @input=${(event: Event) => { if (event.target instanceof HTMLTextAreaElement) this.draftConfig = event.target.value; }}></textarea></label>
      <p class="wide muted">${t("mcp.secretHelp")} <code>${MCP_REDACTED_VALUE}</code></p>
      <div class="actions wide"><button type="submit" class="primary" ?disabled=${this.busy !== ""}>${t("mcp.save")}</button><button type="button" ?disabled=${this.busy !== ""} @click=${() => { this.editing = false; }}>${t("mcp.cancel")}</button></div>
    </form>`;
  }

  private renderLogin() {
    const flow = this.flow;
    if (flow === undefined) return nothing;
    const waiting = flow.state === "waiting" || flow.state === "starting";
    return html`<section class="login" aria-label=${t("mcp.signIn")}><strong>${flow.name} · ${t(`mcp.login.${flow.state}`)}</strong>
      ${flow.authorizationUrl === undefined ? nothing : html`<a href=${flow.authorizationUrl} target="_blank" rel="noopener noreferrer">${t("mcp.openAuthorization")}</a>`}
      ${waiting ? html`<p>${t("mcp.redirectHelp")}</p><form @submit=${(event: SubmitEvent) => { event.preventDefault(); void this.submitRedirect(); }}><label>${t("mcp.redirectUrl")}<input type="url" .value=${this.redirectUrl} @input=${(event: Event) => { if (event.target instanceof HTMLInputElement) this.redirectUrl = event.target.value; }}></label><div class="actions"><button type="submit" ?disabled=${this.busy !== "" || this.redirectUrl.trim() === ""}>${t("mcp.continue")}</button><button type="button" ?disabled=${this.busy !== ""} @click=${() => { void this.cancelLogin(); }}>${t("mcp.cancel")}</button></div></form>` : nothing}
    </section>`;
  }

  override render() {
    return html`<section aria-label="MCP"><div class="heading"><h2>MCP</h2><div class="actions"><button ?disabled=${this.busy !== ""} @click=${() => { void this.reload(); }}>${t("mcp.reload")}</button><button ?disabled=${this.busy !== "" || this.snapshot === undefined} @click=${() => { this.edit(); }}>${t("mcp.add")}</button></div></div>
      <p class="description">${t("mcp.description")}</p><p class="muted">${t("mcp.reloadHelp")}</p>
      ${this.snapshot?.hasProject === true && !this.snapshot.projectTrusted ? html`<p class="notice">${t("mcp.trustHelp")}</p>` : nothing}
      ${this.error === "" ? nothing : html`<p class="error" role="alert">${this.error}</p>`}
      ${this.snapshot?.errors.map((error) => html`<p class="error">${t(`mcp.scope.${error.scope}`)}: ${error.message}</p>`)}
      ${this.busy === "" ? nothing : html`<p role="status">${t("mcp.working")}</p>`}
      ${this.renderEditor()}${this.renderLogin()}
      <div class="servers">${this.snapshot?.servers.map((server) => this.renderServer(server))}</div>
      ${this.snapshot?.servers.length === 0 ? html`<p class="muted">${t("mcp.empty")}</p>` : nothing}
    </section>`;
  }

  static override styles = [sharedSettingsEditorStyles, css`
    section, .servers { display: grid; gap: 14px; min-width: 0; }
    .heading, header, .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .heading { justify-content: space-between; gap: 16px; }
    .description { font-size: 14px; line-height: 20px; }
    .server, .editor, .login { padding: 12px; border: 0; border-radius: 10px; background: var(--pi-surface); display: grid; gap: 12px; min-width: 0; }
    header > span, .source { color: var(--pi-muted); font-size: 12px; }
    header strong, .source { overflow-wrap: anywhere; }
    .badge { padding: 2px 6px; border: 0; border-radius: 5px; background: var(--pi-selection-bg); }
    .notice { color: var(--pi-text); border: 0; border-radius: 10px; background: var(--pi-warning-surface); padding: 12px; }
    .editor { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    label { display: grid; gap: 7px; min-width: 0; }
    .wide { grid-column: 1 / -1; }
    pre { max-height: 360px; overflow: auto; margin-top: 8px; }
    details { min-width: 0; }
    .tool { margin: 8px 0; padding: 8px 10px; border-radius: 6px; background: var(--pi-bg); }
    .tool p { margin-top: 6px; overflow-wrap: anywhere; }
    .login form { display: grid; gap: 12px; }
    a { color: var(--pi-accent); overflow-wrap: anywhere; }
    @media (max-width: 600px) { .editor { grid-template-columns: minmax(0, 1fr); } }
  `, settingsDesignStyles];
}

function errorMessage(error: unknown): string { return error instanceof Error && !(error instanceof SyntaxError) ? error.message : t("mcp.requestFailed"); }
