import { settingsDesignStyles } from "./settingsDesignStyles";
import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { t } from "../../../../shared/i18n";
import { MODEL_SECRET_UNCHANGED, type ModelConfigurationResponse, type ModelConnectionResult, type ModelDiscoveryResult } from "../../../../shared/modelConfiguration";
import { modelConfigurationApi } from "../../api/modelConfiguration";
import { ModelDraftFieldError, modelEditorDraft, providerEditorDraft, providerFromEditorDraft, type ModelEditorDraft, type ProviderEditorDraft } from "./settingsModelsDraft";
import { sharedSettingsEditorStyles } from "./sharedSettingsEditorStyles";

const API_PROTOCOLS = ["openai-completions", "openai-responses", "anthropic-messages", "google-generative-ai", "mistral-conversations", "openai-codex-responses", "pi-messages"];

@customElement("settings-models-panel")
export class SettingsModelsPanel extends LitElement {
  @property() machineId = "local";
  @property() targetLabel = "";
  @property({ attribute: false }) api = modelConfigurationApi;
  @property({ attribute: false }) onConfigurationSaved?: () => void | Promise<void>;
  @state() private configuration: ModelConfigurationResponse | undefined;
  @state() private drafts: ProviderEditorDraft[] = [];
  @state() private busy = false;
  @state() private error = "";
  @state() private message = "";
  @state() private discovery: { providerIndex: number; result: ModelDiscoveryResult; selected: Set<string>; query: string } | undefined;
  @state() private testResult: { providerIndex: number; modelIndex: number; result: ModelConnectionResult } | undefined;
  get hasUnsavedChanges(): boolean {
    return this.configuration !== undefined && JSON.stringify(this.drafts) !== JSON.stringify(this.configuration.providers.map(providerEditorDraft));
  }

  @state() private fieldError: { providerIndex: number; error: ModelDraftFieldError } | undefined;

  private controller: AbortController | undefined;
  private generation = 0;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("machineId")) void this.reload();
  }
  protected override updated(changed: PropertyValues): void {
    if (!changed.has("fieldError")) return;
    for (const input of this.renderRoot.querySelectorAll('[aria-invalid="true"]')) { input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); }
    const invalid = this.fieldError;
    if (invalid === undefined) return;
    const provider = this.renderRoot.querySelector(`[data-provider-index="${String(invalid.providerIndex)}"]`);
    const scope = invalid.error.modelIndex === undefined ? provider : provider?.querySelector(`[data-model-index="${String(invalid.error.modelIndex)}"]`);
    const input = scope?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-field="${invalid.error.field}"]`);
    if (input === null || input === undefined) return;
    for (let parent = input.parentElement; parent !== null; parent = parent.parentElement) { if (parent instanceof HTMLDetailsElement) parent.open = true; }
    input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "model-field-error");
    input.focus({ preventScroll: true }); input.scrollIntoView({ block: "center" });
  }

  override connectedCallback(): void { super.connectedCallback(); if (this.hasUpdated) void this.reload(); }
  override disconnectedCallback(): void { this.controller?.abort(); this.generation++; super.disconnectedCallback(); }

  override render(): TemplateResult {
    return html`
      <header><div><h2>${t("modelsSettings.heading")}</h2><p>${t("modelsSettings.description")} ${this.targetLabel}</p></div>
        <button type="button" data-action="reload" ?disabled=${this.busy} @click=${() => { if (!this.hasUnsavedChanges || window.confirm(t("settingsDraft.reload"))) void this.reload(); }}>${t("modelsSettings.reload")}</button></header>
      <p class="setup-guide">${t("modelsSettings.setupGuide")}</p>
      ${this.error === "" || this.configuration !== undefined ? nothing : html`<p class="error" role="alert">${this.error}</p>`}

      ${this.busy ? html`<p role="status">${this.configuration === undefined ? t("modelsSettings.loading") : t("modelsSettings.busy")}</p>` : nothing}
      ${this.configuration === undefined ? nothing : html`<fieldset ?disabled=${this.busy}>
        ${this.drafts.length === 0 ? html`<p>${t("modelsSettings.noProviders")}</p>` : nothing}
        ${this.drafts.map((provider, index) => this.renderProvider(provider, index))}
        <footer><div class="save-feedback">${this.error === "" ? this.message === "" ? this.hasUnsavedChanges ? html`<span>${t("settingsDraft.unsaved")}</span>` : nothing : html`<span role="status">${this.message}</span>` : html`<span class="error" role="alert">${this.error}</span>`}</div><button type="button" data-action="add-provider" @click=${() => { this.drafts = [...this.drafts, providerEditorDraft({ id: "", api: "openai-completions", models: [] })]; this.clearResults(); }}>${t("modelsSettings.addProvider")}</button>
          <button type="button" class="primary" data-action="save" @click=${() => { void this.save(); }}>${t("modelsSettings.save")}</button></footer>
      </fieldset>`}
      <datalist id="model-api-protocols">${API_PROTOCOLS.map((protocol) => html`<option value=${protocol}></option>`)}</datalist>
    `;
  }

  private renderProvider(provider: ProviderEditorDraft, index: number): TemplateResult {
    const saved = this.configuration?.providers.some((row) => row.id === provider.id) ?? false;
    return html`<section class="provider" data-provider-index=${index}>
      <div class="row-heading"><h3>${provider.id || t("modelsSettings.addProvider")}</h3><button type="button" class="danger" data-action="remove-provider" @click=${() => { this.drafts = this.drafts.filter((_, at) => at !== index); this.clearResults(); }}>${t("modelsSettings.removeProvider")}</button></div>
      <div class="fields">
        <label>${t("modelsSettings.providerId")}<input data-field="provider-id" .value=${provider.id} ?disabled=${saved} @input=${(event: Event) => { this.patchProvider(index, { id: inputValue(event) }); }}></label>
        <label>${t("modelsSettings.baseUrl")}<input data-field="provider-url" .value=${provider.baseUrl} placeholder="https://api.example.com/v1" @input=${(event: Event) => { this.patchProvider(index, { baseUrl: inputValue(event) }); }}></label>
        <label>${t("modelsSettings.api")}<input data-field="provider-api" list="model-api-protocols" .value=${provider.api} placeholder=${t("modelsSettings.apiDefault")} @input=${(event: Event) => { this.patchProvider(index, { api: inputValue(event) }); }}></label>
        <label>${t("modelsSettings.apiKey")}<input data-field="provider-key" type="password" autocomplete="new-password" placeholder="\u0024{API_KEY}" .value=${provider.apiKey} @input=${(event: Event) => { this.patchProvider(index, { apiKey: inputValue(event) }); }}>
          ${provider.apiKey === MODEL_SECRET_UNCHANGED ? html`<small>${t("modelsSettings.keepSecret")}</small>` : nothing}
          ${provider.apiKey === "" ? nothing : html`<button type="button" data-action="clear-key" @click=${() => { this.patchProvider(index, { apiKey: "" }); }}>${t("modelsSettings.clearKey")}</button>`}</label>
      </div>
      <details class="advanced connection-advanced"><summary>${t("modelsSettings.connectionAdvanced")}</summary><div class="fields">
        <label class="wide">${t("modelsSettings.headers")}<textarea data-field="provider-headers" rows="3" spellcheck="false" .value=${provider.headers} @input=${(event: Event) => { this.patchProvider(index, { headers: inputValue(event) }); }}></textarea><small>${t("modelsSettings.keepSecret")}</small>${this.renderFieldError(index, "provider-headers")}</label>
      </div></details>
      <div class="actions"><button type="button" data-action="add-model" @click=${() => { this.patchProvider(index, { models: [...provider.models, modelEditorDraft({ id: "", contextWindow: 128000, maxTokens: 16384 })] }); }}>${t("modelsSettings.addModel")}</button>
        <button type="button" data-action="discover" @click=${() => { void this.discover(index); }}>${t("modelsSettings.discover")}</button></div>
      ${this.discovery?.providerIndex === index ? this.renderDiscovery() : nothing}
      ${provider.models.map((model, modelIndex) => this.renderModel(model, index, modelIndex))}
    </section>`;
  }

  private renderModel(model: ModelEditorDraft, providerIndex: number, modelIndex: number): TemplateResult {
    return html`<details class="model" data-model-index=${modelIndex} open><summary>${model.id || t("modelsSettings.addModel")}${model.override ? html` · ${t("modelsSettings.override")}` : nothing}</summary>
      <div class="fields">
        <label>${t("modelsSettings.modelId")}<input data-field="model-id" .value=${model.id} @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { id: inputValue(event) }); }}></label>
        <label>${t("modelsSettings.name")}<input data-field="model-name" .value=${model.name} @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { name: inputValue(event) }); }}></label>
        <label class="check"><input type="checkbox" data-field="model-reasoning" .checked=${model.reasoning} @change=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { reasoning: checked(event), reasoningSet: true }); }}>${t("modelsSettings.reasoning")}</label>
        <label class="check"><input type="checkbox" data-field="model-image" .checked=${model.imageInput} @change=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { imageInput: checked(event), inputSet: true }); }}>${t("modelsSettings.imageInput")}</label>
      </div>
      <details class="advanced"><summary>${t("modelsSettings.advanced")}</summary><div class="fields">
        <label>${t("modelsSettings.contextWindow")}<input data-field="model-context" inputmode="numeric" .value=${model.contextWindow} @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { contextWindow: inputValue(event) }); }}></label>
        <label>${t("modelsSettings.maxTokens")}<input data-field="model-output" inputmode="numeric" .value=${model.maxTokens} @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { maxTokens: inputValue(event) }); }}></label>
        <label class="check wide"><input type="checkbox" data-field="model-override" .checked=${model.override} @change=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { override: checked(event) }); }}>${t("modelsSettings.override")}</label>
        <label>${t("modelsSettings.api")}<input list="model-api-protocols" .value=${model.api} @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { api: inputValue(event) }); }}></label>
        <label>${t("modelsSettings.baseUrl")}<input .value=${model.baseUrl} @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { baseUrl: inputValue(event) }); }}></label>
        <label class="wide">${t("modelsSettings.headers")}<textarea data-field="model-headers" rows="3" spellcheck="false" .value=${model.headers} @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { headers: inputValue(event) }); }}></textarea>${this.renderFieldError(providerIndex, "model-headers", modelIndex)}</label>
        <label>${t("modelsSettings.cost")}<textarea data-field="model-cost" rows="4" spellcheck="false" .value=${model.cost} placeholder='{"input":0,"output":0,"cacheRead":0,"cacheWrite":0}' @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { cost: inputValue(event) }); }}></textarea>${this.renderFieldError(providerIndex, "model-cost", modelIndex)}</label>
        <label>${t("modelsSettings.thinkingMap")}<textarea data-field="model-thinking" rows="4" spellcheck="false" .value=${model.thinkingLevelMap} placeholder='{"high":"high","max":null}' @input=${(event: Event) => { this.patchModel(providerIndex, modelIndex, { thinkingLevelMap: inputValue(event) }); }}></textarea>${this.renderFieldError(providerIndex, "model-thinking", modelIndex)}</label>
      </div></details>
      <p><small>${t("modelsSettings.testHelp")}</small></p>
      <div class="actions"><button type="button" data-action="test" @click=${() => { void this.test(providerIndex, modelIndex); }}>${t("modelsSettings.test")}</button>
        <button type="button" class="danger" data-action="remove-model" @click=${() => { const provider = this.drafts[providerIndex]; if (provider !== undefined) this.patchProvider(providerIndex, { models: provider.models.filter((_, at) => at !== modelIndex) }); }}>${t("modelsSettings.removeModel")}</button></div>
      ${this.testResult?.providerIndex === providerIndex && this.testResult.modelIndex === modelIndex ? this.renderTestResult(this.testResult.result) : nothing}
    </details>`;
  }

  private renderTestResult(result: ModelConnectionResult): TemplateResult {
    return html`<p role=${result.ok ? "status" : "alert"} class=${result.ok ? "success" : "error"}>${result.ok ? t("modelsSettings.testOk") : result.error ?? t("modelsSettings.error")} · ${result.latencyMs} ms${result.status === undefined ? nothing : html` · HTTP ${result.status}`}</p>
      ${result.responseText === undefined ? nothing : html`<pre>${result.responseText}</pre>`}`;
  }

  private renderDiscovery(): TemplateResult | typeof nothing {
    const discovery = this.discovery;
    if (discovery === undefined) return nothing;
    const existing = new Set(this.drafts[discovery.providerIndex]?.models.map((model) => model.id));
    const models = discovery.result.models.filter((model) => `${model.id} ${model.name ?? ""}`.toLowerCase().includes(discovery.query.toLowerCase()));
    return html`<div class="discovery"><p>${t("modelsSettings.discoverHelp")}</p>
      <input aria-label=${t("modelsSettings.filter")} placeholder=${t("modelsSettings.filter")} .value=${discovery.query} @input=${(event: Event) => { this.discovery = { ...discovery, query: inputValue(event) }; }}>
      ${discovery.result.truncated ? html`<p role="status">${t("modelsSettings.truncated")}</p>` : nothing}
      <div class="actions"><button type="button" @click=${() => { this.discovery = { ...discovery, selected: new Set(models.filter((model) => !existing.has(model.id)).map((model) => model.id)) }; }}>${t("modelsSettings.selectAll")}</button>
      <button type="button" data-action="add-selected" ?disabled=${discovery.selected.size === 0} @click=${() => { this.addDiscovered(); }}>${t("modelsSettings.addSelected")} (${discovery.selected.size})</button></div>
      <div class="discovered-list">${models.map((model) => html`<label class="check"><input type="checkbox" data-discovered-id=${model.id} ?disabled=${existing.has(model.id)} .checked=${discovery.selected.has(model.id)} @change=${(event: Event) => { const selected = new Set(discovery.selected); if (checked(event)) selected.add(model.id); else selected.delete(model.id); this.discovery = { ...discovery, selected }; }}><code>${model.id}</code>${model.name === undefined ? nothing : html` · ${model.name}`}</label>`)}</div>
    </div>`;
  }

  private renderFieldError(providerIndex: number, field: string, modelIndex?: number): TemplateResult | typeof nothing {
    const invalid = this.fieldError;
    return invalid?.providerIndex === providerIndex && invalid.error.field === field && invalid.error.modelIndex === modelIndex
      ? html`<small id="model-field-error" class="error">${invalid.error.message}</small>` : nothing;
  }

  private providerFromDraft(index: number) {
    const draft = this.drafts[index];
    if (draft === undefined) throw new Error(t("modelsSettings.error"));
    try { return providerFromEditorDraft(draft); }
    catch (error) { if (error instanceof ModelDraftFieldError) this.fieldError = { providerIndex: index, error }; throw error; }
  }

  private clearResults(): void { this.error = ""; this.fieldError = undefined; this.message = ""; this.testResult = undefined; this.discovery = undefined; }
  private patchProvider(index: number, patch: Partial<ProviderEditorDraft>): void { this.drafts = this.drafts.map((row, at) => at === index ? { ...row, ...patch } : row); this.clearResults(); }
  private patchModel(index: number, modelIndex: number, patch: Partial<ModelEditorDraft>): void { const provider = this.drafts[index]; if (provider !== undefined) this.patchProvider(index, { models: provider.models.map((row, at) => at === modelIndex ? { ...row, ...patch } : row) }); }

  private begin(): { generation: number; signal: AbortSignal; machineId: string } {
    this.controller?.abort(); this.controller = new AbortController(); this.busy = true; this.error = ""; this.message = "";
    return { generation: ++this.generation, signal: this.controller.signal, machineId: this.machineId };
  }
  private async reload(): Promise<void> {
    const operation = this.begin(); this.configuration = undefined; this.drafts = []; this.clearResults();
    try {
      const configuration = await this.api.read(operation.machineId, operation.signal);
      if (operation.generation !== this.generation) return;
      this.configuration = configuration; this.drafts = configuration.providers.map(providerEditorDraft);
    } catch (error) { if (!operation.signal.aborted) this.error = errorMessage(error); }
    finally { if (operation.generation === this.generation) this.busy = false; }
  }
  private async save(): Promise<void> {
    if (this.configuration === undefined) return;
    const operation = this.begin();
    try {
      const configuration = await this.api.write({ revision: this.configuration.revision, providers: this.drafts.map((_, index) => this.providerFromDraft(index)) }, operation.machineId, operation.signal);
      if (operation.generation !== this.generation) return;
      this.configuration = configuration; this.drafts = configuration.providers.map(providerEditorDraft); this.clearResults();
      this.message = configuration.refreshWarning === true ? t("modelsSettings.refreshWarning") : t("modelsSettings.saved");
      await this.onConfigurationSaved?.();
    } catch (error) { if (!operation.signal.aborted) this.error = errorMessage(error); }
    finally { if (operation.generation === this.generation) this.busy = false; }
  }
  private async discover(index: number): Promise<void> {
    const provider = this.drafts[index]; if (provider === undefined) return;
    const operation = this.begin();
    try {
      const result = await this.api.discover(this.providerFromDraft(index), operation.machineId, operation.signal);
      if (operation.generation === this.generation) this.discovery = { providerIndex: index, result, selected: new Set(), query: "" };
    } catch (error) { if (!operation.signal.aborted) this.error = errorMessage(error); }
    finally { if (operation.generation === this.generation) this.busy = false; }
  }
  private async test(index: number, modelIndex: number): Promise<void> {
    const provider = this.drafts[index]; const model = provider?.models[modelIndex]; if (provider === undefined || model === undefined) return;
    const operation = this.begin(); this.testResult = undefined;
    try {
      const result = await this.api.test(this.providerFromDraft(index), model.id, operation.machineId, operation.signal);
      if (operation.generation === this.generation) this.testResult = { providerIndex: index, modelIndex, result };
    } catch (error) { if (!operation.signal.aborted) this.error = errorMessage(error); }
    finally { if (operation.generation === this.generation) this.busy = false; }
  }
  private addDiscovered(): void {
    const discovery = this.discovery; if (discovery === undefined) return;
    const provider = this.drafts[discovery.providerIndex]; if (provider === undefined) return;
    const existing = new Set(provider.models.map((model) => model.id));
    const additions = discovery.result.models.filter((model) => discovery.selected.has(model.id) && !existing.has(model.id)).map(modelEditorDraft);
    this.patchProvider(discovery.providerIndex, { models: [...provider.models, ...additions] });
  }

  static override styles = [sharedSettingsEditorStyles, css`
    :host { display: grid; gap: 14px; }
    header, .row-heading, footer, .actions { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    header { align-items: flex-start; gap: 16px; }
    header > div { display: grid; gap: 6px; min-width: 0; flex: 1; }
    header p { font-size: 14px; line-height: 20px; }
    fieldset { padding: 0; border: 0; min-width: 0; margin: 0; display: grid; gap: 14px; }
    .provider, .model, .discovery { border: 1px solid var(--pi-border-muted); border-radius: 12px; padding: 16px; min-width: 0; background: var(--pi-bg); }
    .setup-guide { margin: 0; padding: 12px 14px; border-radius: 10px; background: var(--pi-surface); color: var(--pi-muted); }
    .provider { display: grid; gap: 14px; }
    .row-heading h3 { overflow-wrap: anywhere; }
    .model, .discovery { background: var(--pi-bg); }
    .model > summary { margin-bottom: 12px; }
    .model:not([open]) > summary { margin-bottom: 0; }
    .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .model > .fields { margin-bottom: 14px; }
    label { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
    .wide { grid-column: 1 / -1; }
    .check { flex-direction: row; align-items: center; gap: 8px; }
    .advanced { margin: 14px 0; }
    .advanced > .fields { margin-top: 12px; }
    .model > p, .model > .actions { margin-top: 12px; }
    .actions { justify-content: flex-start; }
    footer { position: sticky; bottom: -18px; z-index: 1; padding: 12px 0; background: var(--pi-bg); border-top: 1px solid var(--pi-border-muted); }
    .save-feedback { flex: 1 1 100%; min-width: 0; overflow-wrap: anywhere; color: var(--pi-muted); }
    @media (max-width: 760px) { footer { bottom: -14px; } }
    .discovery { display: grid; gap: 12px; }
    .discovered-list { max-height: 260px; overflow: auto; }
    .discovered-list label { padding: 6px 0; overflow-wrap: anywhere; }
    .discovered-list code { overflow-wrap: anywhere; }
    @media (max-width: 600px) { .fields { grid-template-columns: minmax(0, 1fr); } }
  `, settingsDesignStyles];
}

function inputValue(event: Event): string { return event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ? event.target.value : ""; }
function checked(event: Event): boolean { return event.target instanceof HTMLInputElement && event.target.checked; }
function errorMessage(error: unknown): string { return error instanceof Error && !(error instanceof SyntaxError) ? error.message : t("modelsSettings.error"); }
