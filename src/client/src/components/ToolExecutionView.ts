import { renderUiIcon } from "./uiIcons";
import { localizedTemplate, localizedText, t } from "../../../shared/i18n";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { writeClipboardText } from "../clipboard";
import type { ToolExecutionPart } from "./shared";
import { toolDisplayName, toolDisplayText } from "../toolPresentation";

const MAX_COLLAPSED_DIFF_LINES = 180;

interface ToolTarget {
  label: "Command" | "File" | "Input";
  text: string;
}

@customElement("tool-execution-view")
export class ToolExecutionView extends LitElement {
  @property({ attribute: false }) execution: ToolExecutionPart | undefined;
  @state() private showFullDiff = false;
  @state() private copied = false;
  @state() private copyError = false;
  @state() private diffOpen = true;

  override render() {
    const execution = this.execution;
    if (execution === undefined) return null;

    const path = pathFromArgs(execution.args);
    const actualDiff = diffFromDetails(execution.details);
    const preview = execution.preview;
    const visibleDiff = actualDiff ?? preview?.diff;
    const diffStats = visibleDiff === undefined ? undefined : countDiffLines(visibleDiff);
    const previewMismatch = actualDiff !== undefined && preview?.diff !== undefined && actualDiff !== preview.diff;
    const errorText = execution.status === "error" ? execution.resultText : preview?.error;
    const bodyText = visibleDiff === undefined ? toolDisplayText(execution) : undefined;
    const target = toolTarget(execution, path);

    return html`
      <section class=${`tool-card ${execution.status}`}>
        <div class="tool-header">
          <div class="tool-title">
            <span class="status-icon" aria-hidden="true">${statusIcon(execution.status)}</span>
            <strong title=${execution.toolName}>${toolDisplayName(execution)}</strong>
            ${this.renderHeaderTarget(target)}
          </div>
          <div class="tool-meta">
            ${editCountLabel(execution) === undefined ? null : html`<span>${editCountLabel(execution)}</span>`}
            ${diffStats === undefined ? null : html`<span class="diff-stats"><b class="added">+${diffStats.added}</b><span>/</span><b class="removed">-${diffStats.removed}</b></span>`}
            <span class="status-label">${statusLabel(execution.status)}</span>
          </div>
        </div>

        ${previewMismatch ? localizedTemplate("ToolExecutionView.applied_diff_differs_from_the_preview.67520e1d", html)`<p class="notice">Applied diff differs from the preview.</p>` : null}
        ${errorText === undefined || errorText === "" ? null : html`<pre class="error-text">${errorText}</pre>`}
        ${this.copyError ? html`<p role="alert" class="error-text">${t("ui.tools.copyFailed")}</p>` : null}
        ${visibleDiff === undefined ? this.renderTextBody(bodyText, execution.status === "error", target) : this.renderDiffBody(visibleDiff, actualDiff === undefined ? t("ToolExecutionView.preview_diff.5d45110d") : t("ToolExecutionView.applied_diff.fb9a87b0"), target)}
      </section>
    `;
  }

  private renderHeaderTarget(target: ToolTarget | undefined) {
    if (target === undefined) return null;
    const className = target.label === "File" ? "path" : "summary";
    return html`<span class=${className} title=${target.text} aria-label=${`${toolTargetLabel(target.label)}: ${target.text}`}>${target.text}</span>`;
  }

  private renderExpandedTarget(target: ToolTarget | undefined) {
    if (target === undefined) return null;
    return html`
      <div class="detail-target">
        <span class="detail-label">${toolTargetLabel(target.label)}</span>
        <pre class="detail-target-value">${target.text}</pre>
      </div>
    `;
  }

  private renderTextBody(text: string | undefined, open: boolean, target: ToolTarget | undefined) {
    if ((text === undefined || text === "") && target === undefined) return null;
    return localizedTemplate("ToolExecutionView.details.9ee206f3", html)`
      <details class="text-body" ?open=${open}>
        <summary>Details</summary>
        ${this.renderExpandedTarget(target)}
        ${text === undefined || text === "" ? null : localizedTemplate("ToolExecutionView.result.5f8bc2b0", html)`
          <div class="detail-result">
            <span class="detail-label">Result</span>
            <button type="button" @click=${() => { void this.copyDiff(this.execution?.resultText ?? text); }}>${this.copied ? t("ToolExecutionView.copied.22728566") : t("ui.tools.copyRaw")}</button>
            <pre>${text}</pre>
          </div>
        `}
      </details>
    `;
  }

  private renderDiffBody(diff: string, label: string, target: ToolTarget | undefined) {
    const lines = diff.split("\n");
    const truncated = !this.showFullDiff && lines.length > MAX_COLLAPSED_DIFF_LINES;
    const visibleLines = truncated ? lines.slice(0, MAX_COLLAPSED_DIFF_LINES) : lines;
    return html`
      <details class="diff-details" ?open=${this.diffOpen} @toggle=${(event: Event) => { this.onDiffToggle(event); }}>
        <summary>
          <span>${label}</span>
          <small>${String(lines.length)} ${lines.length === 1 ? "line" : "lines"}</small>
        </summary>
        ${this.renderExpandedTarget(target)}
        <div class="diff-toolbar">
          <span>${truncated ? localizedText("ToolExecutionView.showing_of_lines.25201e9f")`Showing ${String(visibleLines.length)} of ${String(lines.length)} lines` : t("ToolExecutionView.full_diff.9d79d291")}</span>
          <button type="button" @click=${() => { void this.copyDiff(diff); }}>${this.copied ? t("ToolExecutionView.copied.22728566") : t("ToolExecutionView.copy_diff.29fecc82")}</button>
        </div>
        <pre class="diff" aria-label=${label}><code class="diff-content">${visibleLines.map((line) => html`<span class=${diffLineClass(line)}>${line}</span>`)}</code></pre>
        ${truncated ? html`
          <button class="show-more" type="button" @click=${() => { this.showFullDiff = true; }}>
            Show all ${String(lines.length)} diff lines
          </button>
        ` : null}
      </details>
    `;
  }

  private onDiffToggle(event: Event): void {
    const details = event.currentTarget;
    if (details instanceof HTMLDetailsElement) this.diffOpen = details.open;
  }

  private async copyDiff(diff: string): Promise<void> {
    const copied = await writeClipboardText(diff);
    this.copyError = !copied;
    if (!copied) {
      this.copied = false;
      return;
    }
    this.copied = true;
    window.setTimeout(() => { this.copied = false; }, 1200);
  }

  static override styles = css`
    :host { display: block; width: 100%; max-width: 100%; min-width: 0; color: var(--pi-text); font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); }
    .tool-card { display: grid; gap: 4px; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden; border: 0; border-radius: 10px; background: var(--pi-surface); padding: 8px 10px; color: var(--pi-text); }
    .tool-card.running, .tool-card.pending { background: var(--pi-surface); }
    .tool-card.error { background: color-mix(in srgb, var(--pi-danger) 10%, var(--pi-bg)); }
    .tool-header { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 5px 10px; min-width: 0; }
    .tool-title { flex: 1 1 auto; display: inline-flex; align-items: baseline; gap: 7px; min-width: 0; }
    .status-icon { flex: 0 0 auto; color: var(--pi-muted); }
    .success .status-icon, .success .status-label { color: var(--pi-success); }
    .running .status-icon, .running .status-label, .pending .status-icon, .pending .status-label { color: var(--pi-warning); }
    .error .status-icon, .error .status-label { color: var(--pi-danger); }
    strong { flex: 0 0 auto; color: var(--pi-text); font-weight: var(--pi-font-weight-medium, 460); }
    .path, .summary { display: block; flex: 1 1 auto; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: pre; color: var(--pi-text-secondary); font: var(--pi-font-weight-regular, 360) 12px/17.5px var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); direction: ltr; text-align: left; unicode-bidi: isolate; }
    .summary { color: var(--pi-muted); font-family: inherit; }
    .tool-meta { flex: 0 1 auto; min-width: 0; display: inline-flex; align-items: baseline; flex-wrap: wrap; gap: 5px 8px; margin-left: auto; color: var(--pi-muted); font-size: 12px; }
    .diff-stats { display: inline-flex; gap: 3px; }
    .added, .diff .added { color: var(--pi-success); }
    .removed, .diff .removed { color: var(--pi-danger); }
    .status-label { text-transform: uppercase; letter-spacing: 0; color: var(--pi-muted); }
    .notice { margin: 0; color: var(--pi-warning); }
    .muted { margin: 0; color: var(--pi-muted); }
    .error-text { margin: 0; border: 0; border-radius: 7px; background: color-mix(in srgb, var(--pi-danger) 10%, var(--pi-bg)); color: var(--pi-danger); padding: 8px; white-space: pre-wrap; overflow-wrap: anywhere; font: var(--pi-font-weight-regular, 360) 12px var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); }
    .text-body { padding-top: 6px; }
    .detail-target, .detail-result { display: grid; gap: 4px; margin-top: 8px; min-width: 0; }
    .detail-result { grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: 8px; }
    .detail-result > button { justify-self: end; }
    .detail-result > pre { grid-column: 1 / -1; }
    .detail-label { color: var(--pi-muted); font-size: 12px; }
    .text-body pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: var(--pi-font-weight-regular, 360) 12px var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); color: var(--pi-text); }
    .detail-result pre { box-sizing: border-box; max-width: 100%; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; scrollbar-width: thin; border: 0; border-radius: 7px; background: var(--pi-bg); padding: 8px; white-space: pre; overflow-wrap: normal; direction: ltr; text-align: left; unicode-bidi: isolate; }
    .detail-target-value { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--pi-accent); font: var(--pi-font-weight-regular, 360) 12px var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); direction: ltr; text-align: left; unicode-bidi: isolate; }
    .diff-details { min-width: 0; max-width: 100%; padding-top: 6px; }
    .diff-details > summary { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; min-width: 0; color: var(--pi-muted); cursor: pointer; }
    .diff-details > summary span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .diff-details > summary small { flex: 0 0 auto; color: var(--pi-dim); }
    .diff-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; margin-top: 8px; color: var(--pi-muted); font-size: 12px; }
    .diff-toolbar span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button { border: 0; border-radius: 6px; background: transparent; color: var(--pi-text); padding: 4px 7px; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-control-font-family, var(--pi-font-family, system-ui, sans-serif)); cursor: pointer; }
    .diff-toolbar button, .detail-result > button { max-width: 100%; color: var(--pi-muted); }
    button:not(:disabled):hover { background: var(--pi-surface-hover); }
    .diff-toolbar button:not(:disabled):hover, .detail-result > button:not(:disabled):hover { color: var(--pi-text); }
    button:disabled { opacity: .5; cursor: not-allowed; }
    button:focus-visible, summary:focus-visible { outline: 2px solid var(--pi-accent); outline-offset: 2px; }
    .diff { box-sizing: border-box; width: 100%; max-width: 100%; min-width: 0; margin: 0; overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain; border: 0; border-radius: 7px; background: var(--pi-bg); padding: 8px 0; color: var(--pi-muted); font: var(--pi-font-weight-regular, 360) 12px var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); line-height: 1.45; }
    .diff-content { display: block; width: max-content; min-width: 100%; }
    .diff span { display: block; min-height: 1.45em; padding: 0 8px; white-space: pre; }
    .diff .context { color: var(--pi-muted); }
    .diff .hunk { color: var(--pi-accent); }
    .diff .file { color: var(--pi-dim); }
    .diff .meta { color: var(--pi-dim); }
    .diff .added { background: color-mix(in srgb, var(--pi-success) 12%, transparent); }
    .diff .removed { background: color-mix(in srgb, var(--pi-danger) 12%, transparent); }
    .show-more { justify-self: start; }
  `;
}

function toolTarget(execution: ToolExecutionPart, path: string | undefined): ToolTarget | undefined {
  if (path !== undefined && path !== "") return { label: "File", text: path };
  const command = getString(execution.args, "command");
  if (command !== undefined && command !== "") return { label: "Command", text: command };
  if (execution.summary !== "") return { label: "Input", text: execution.summary };
  return undefined;
}

function pathFromArgs(args: unknown): string | undefined {
  return getString(args, "path") ?? getString(args, "file_path");
}

function editCountLabel(execution: ToolExecutionPart): string | undefined {
  if (execution.toolName !== "edit") return undefined;
  const edits = getProperty(execution.args, "edits");
  if (Array.isArray(edits)) return localizedText("ToolExecutionView.edit.b20676b2")`${String(edits.length)} edit${edits.length === 1 ? "" : "s"}`;
  if (typeof getProperty(execution.args, "oldText") === "string" && typeof getProperty(execution.args, "newText") === "string") return t("ToolExecutionView.edit.00b5f0df");
  return undefined;
}

function diffFromDetails(details: unknown): string | undefined {
  return getString(details, "diff");
}

function countDiffLines(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split("\n")) {
    if (isAddedDiffLine(line)) added++;
    else if (isRemovedDiffLine(line)) removed++;
  }
  return { added, removed };
}

function diffLineClass(line: string): string {
  if (isAddedDiffLine(line)) return "added";
  if (isRemovedDiffLine(line)) return "removed";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+++") || line.startsWith("---")) return "file";
  if (line.startsWith("diff ") || line.startsWith("index ")) return "meta";
  return "context";
}

function isAddedDiffLine(line: string): boolean {
  return line.startsWith("+") && !line.startsWith("+++");
}

function isRemovedDiffLine(line: string): boolean {
  return line.startsWith("-") && !line.startsWith("---");
}

function statusIcon(status: ToolExecutionPart["status"]) {
  if (status === "success") return renderUiIcon("check");
  if (status === "error") return renderUiIcon("close");
  if (status === "running") return renderUiIcon("dot", 12);
  return renderUiIcon("circle", 12);
}

function statusLabel(status: ToolExecutionPart["status"]): string {
  if (status === "success") return t("ToolExecutionView.done.89ba87a2");
  if (status === "error") return t("ToolExecutionView.failed.7451a21d");
  if (status === "running") return t("ToolExecutionView.running.a2835d3a");
  return t("ToolExecutionView.pending.75d0ead0");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getProperty(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function getString(value: unknown, key: string): string | undefined {
  const property = getProperty(value, key);
  return typeof property === "string" ? property : undefined;
}

function toolTargetLabel(label: ToolTarget["label"]): string {
  if (label === "File") return t("ToolExecutionView.file.2e137c95");
  if (label === "Command") return t("ToolExecutionView.command.22162053");
  return t("ToolExecutionView.input.492ae516");
}
