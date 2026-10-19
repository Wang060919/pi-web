import { getLocale, localizedTemplate, t } from "./i18n.js";
import type { TemplateResult } from "lit";
import type { HtmlTemplateTag, PiWebComponentStatus, PiWebPlugin, PiWebStatusMessage, PluginRuntimeState, WorkspacePanelTerminal } from "@jmfederico/pi-web/plugin-api";
import { additionalCommands, fallbackDockerStatus, formatVersion, installationLabel, messageCount, recommendedCommand, shouldShowUpdatesPanel, statusFor, type CommandEntry, type UpdatesRuntimeHint } from "./updatesLogic.js";

function runCommandInTerminal(terminal: WorkspacePanelTerminal, label: string, command: string): void {
  void terminal.runCommand({
    title: label,
    command,
    open: true,
    metadata: { "pi.plugin": "updates" },
  }).catch((error: unknown) => {
    console.error(`Updates plugin failed to run "${label}"`, error);
  });
}

function renderComponent(html: HtmlTemplateTag, component: PiWebComponentStatus): TemplateResult {
  const status = !component.available
    ? t("pi-web-plugin.unavailable.18c46b0c")
    : component.stale
      ? t("pi-web-plugin.restart_needed.c2ca8efe")
      : t("pi-web-plugin.current.4dc8aa30");
  return localizedTemplate("pi-web-plugin.running_installed.bc30c0e4", html)`
    <div class="updates-version-row">
      <strong>${getLocale() === "zh-CN" ? component.component === "web" ? t("ui.component.web") : t("ui.component.sessiond") : component.label}</strong>
      <span>${status}</span>
      <small>running ${formatVersion(component.runtimeVersion)} · installed ${formatVersion(component.installedVersion)}</small>
      <small>${installationLabel(component.installation)}${component.installation?.path === undefined ? "" : ` · ${component.installation.path}`}</small>
    </div>
  `;
}

function renderCommandActions(html: HtmlTemplateTag, terminal: WorkspacePanelTerminal | undefined, label: string, command: string): TemplateResult {
  return localizedTemplate("pi-web-plugin.copy.331a0f6e", html)`
    <span class="updates-command-actions">
      <button @click=${() => { void navigator.clipboard.writeText(command); }}>Copy</button>
      ${terminal === undefined ? null : localizedTemplate("pi-web-plugin.run.7ae8c817", html)`<button class="primary" @click=${() => { runCommandInTerminal(terminal, label, command); }}>Run</button>`}
    </span>
  `;
}

function renderCommand(html: HtmlTemplateTag, terminal: WorkspacePanelTerminal | undefined, label: string, command: string): TemplateResult {
  return html`
    <div class="updates-command">
      <span>${label}</span>
      <code>${command}</code>
      ${renderCommandActions(html, terminal, label, command)}
    </div>
  `;
}

function updatesRuntimeHintFromModuleUrl(moduleUrl: string): UpdatesRuntimeHint {
  try {
    const dockerMode = new URL(moduleUrl).searchParams.get("piWebDockerMode");
    return dockerMode === "runtime" || dockerMode === "dev" ? { dockerMode } : {};
  } catch {
    return {};
  }
}

const runtimeHint = updatesRuntimeHintFromModuleUrl(import.meta.url);

// Status notices never carry their own command row: every command a notice can
// reference already appears exactly once in this panel — either as the single
// recommended action or in the optional commands list — so the panel never
// presents two competing prominent actions for the same situation.
function renderNotice(html: HtmlTemplateTag, message: PiWebStatusMessage): TemplateResult {
  return html`
    <article class=${`updates-message ${message.severity}`}>
      <div class="updates-message-title"><strong>${message.title}</strong><span>${message.severity === "info" ? t("ui.severity.info") : message.severity === "warning" ? t("ui.severity.warning") : t("ui.severity.error")}</span></div>
      <p>${message.body}</p>
    </article>
  `;
}

function renderNotices(html: HtmlTemplateTag, messages: readonly PiWebStatusMessage[]): TemplateResult {
  return html`
    <section>
      ${messages.length === 0 ? localizedTemplate("pi-web-plugin.no_pi_web_update_or_restart_messages.d76088b8", html)`<p class="muted">No PI WEB update or restart messages.</p>` : messages.map((message) => renderNotice(html, message))}
    </section>
  `;
}

function renderRecommended(html: HtmlTemplateTag, terminal: WorkspacePanelTerminal | undefined, recommended: CommandEntry, messages: readonly PiWebStatusMessage[]): TemplateResult {
  return localizedTemplate("pi-web-plugin.recommended.a9c2c7b1", html)`
    <section class="updates-recommended">
      <strong>Recommended</strong>
      ${messages.length === 0
        ? localizedTemplate("pi-web-plugin.run_the_recommended_command_updates_require_confirmatio.479b700c", html)`<p class="muted">Run the recommended command. Updates require confirmation in the terminal and may interrupt active sessions; the CLI will provide instructions if this terminal cannot safely run the update.</p>`
        : messages.map((message) => renderNotice(html, message))}
      ${renderCommand(html, terminal, recommended.label, recommended.command)}
    </section>
  `;
}

function renderAdditionalCommands(html: HtmlTemplateTag, terminal: WorkspacePanelTerminal | undefined, additional: readonly CommandEntry[], hasRecommended: boolean): TemplateResult | undefined {
  if (additional.length === 0) return undefined;
  return html`
    <section>
      <strong>${hasRecommended ? t("pi-web-plugin.additional_commands_optional.ba69f0f0") : t("pi-web-plugin.suggested_commands.c05fb39a")}</strong>
      ${hasRecommended ? localizedTemplate("pi-web-plugin.only_needed_for_finer_control_such_as.311bfb03", html)`<p class="muted">Only needed for finer control, such as restarting a single service.</p>` : null}
      ${additional.map((entry) => renderCommand(html, terminal, entry.label, entry.command))}
    </section>
  `;
}

function renderUpdatesPanel(html: HtmlTemplateTag, terminal: WorkspacePanelTerminal | undefined, state: PluginRuntimeState | undefined): TemplateResult {
  const styles = html`
    <style>
      .toolbar.updates-toolbar, .viewer.updates-status { width: 100%; max-width: 900px; margin-inline: auto; box-sizing: border-box; }
      .toolbar.updates-toolbar { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 20px 24px 0; }
      .viewer.updates-status { flex: 1 1 auto; min-height: 0; box-sizing: border-box; display: flex; flex-direction: column; gap: 18px; padding: 16px 24px 24px; font: var(--pi-font-weight-regular, 360) 13px/18px var(--pi-font-family, system-ui, sans-serif); overflow-y: auto; overflow-x: hidden; }
      .viewer.updates-status section { flex: 0 0 auto; min-width: 0; display: grid; gap: 8px; }
      .viewer.updates-status p { margin: 0; }
      .toolbar strong, .viewer.updates-status strong { font-weight: var(--pi-font-weight-medium, 460); }
      .updates-message { display: grid; gap: 5px; border: 0; border-radius: 8px; padding: 10px; background: var(--pi-surface); }
      .updates-message.warning { border: 1px solid var(--pi-warning-border); background: var(--pi-warning-surface); }
      .updates-message.error { border: 1px solid var(--pi-danger); }
      .updates-message-title { display: flex; gap: 8px; align-items: baseline; }
      .updates-message-title span { color: var(--pi-muted); font-size: 12px; line-height: 16px; }
      .updates-version-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; border-bottom: 0; padding: 6px 0; }
      .updates-version-row small { grid-column: 1 / -1; color: var(--pi-muted); }
      .updates-command { min-width: 0; display: grid; grid-template-columns: minmax(90px, auto) minmax(0, 1fr) auto; gap: 8px; align-items: center; }
      .updates-command code { overflow: auto; border: 0; border-radius: 6px; background: var(--pi-bg); padding: 5px 7px; font: var(--pi-font-weight-regular, 360) 12px/1.46 var(--pi-font-monospace, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); white-space: nowrap; }
      .updates-command-actions { display: inline-flex; gap: 6px; }
      .updates-command-actions button.primary { border: 0; background: var(--pi-selection-bg); color: var(--pi-text); }
      .updates-command-actions button.primary:not(:disabled):hover { background: var(--pi-surface-hover); }
      .updates-recommended { border: 0; border-radius: 8px; padding: 10px; background: var(--pi-surface); }
      .updates-recommended > strong { color: var(--pi-text-bright); }
      .updates-recommended .updates-message { border: none; background: none; padding: 0; }
      .updates-meta { display: grid; gap: 2px; color: var(--pi-muted); font-size: 12px; line-height: 16px; }
      @container (max-width: 760px) {
        .toolbar.updates-toolbar { padding: 16px 16px 0; }
        .viewer.updates-status { padding: 16px; }
      }
      @media (max-width: 520px) {
        .updates-command { grid-template-columns: minmax(0, 1fr) auto; }
        .updates-command > span { grid-column: 1 / -1; }
      }
    </style>
  `;
  const status = statusFor(state) ?? fallbackDockerStatus(runtimeHint);
  if (status === undefined) {
    return localizedTemplate("pi-web-plugin.updates_checking_pi_web_update_status.cef9023a", html)`
      ${styles}
      <section class="toolbar updates-toolbar"><strong>Updates</strong></section>
      <section class="viewer updates-status"><p class="muted">Checking PI WEB update status…</p></section>
    `;
  }

  const messages = status.messages;
  const recommended = recommendedCommand(status);
  const additional = additionalCommands(status, recommended);
  return localizedTemplate("pi-web-plugin.viewer_updates_status_flex_auto_min_height.4a083b3c", html)`
    ${styles}
    <section class="toolbar updates-toolbar"><strong>Updates</strong>${messages.length > 0 ? html`<span class="stale">${String(messages.length)}</span>` : null}</section>
    <section class="viewer updates-status">
      ${recommended === undefined
        ? renderNotices(html, messages)
        : renderRecommended(html, terminal, recommended, messages)}

      <section>
        <strong>Installed services</strong>
        ${renderComponent(html, status.components.web)}
        ${renderComponent(html, status.components.sessiond)}
      </section>

      ${renderAdditionalCommands(html, terminal, additional, recommended !== undefined)}

      <section class="updates-meta">
        <span>Generated ${status.generatedAt}</span>
        ${status.release.latestVersion === undefined ? null : localizedTemplate("pi-web-plugin.latest_npm_release.243fa0ef", html)`<span>Latest npm release ${status.release.latestVersion}</span>`}
        ${status.release.checkedAt === undefined || status.release.skipped === true ? null : localizedTemplate("pi-web-plugin.release_checked.aafc222b", html)`<span>Release checked ${status.release.checkedAt}</span>`}
        ${status.release.skipped === true ? localizedTemplate("pi-web-plugin.remote_version_check_skipped.59f53a87", html)`<span>Remote version check skipped.</span>` : null}
        ${status.release.error === undefined ? null : localizedTemplate("pi-web-plugin.remote_version_check_failed.a4ab28ab", html)`<span>Remote version check failed: ${status.release.error}</span>`}
      </section>
    </section>
  `;
}

const plugin = {
  apiVersion: 4,
  name: "Updates",
  activate: ({ html, svg }) => ({
    contributions: {
      actions: [
        {
          id: "check",
          title: t("pi-web-plugin.check_for_pi_web_updates.19deb5dc"),
          description: t("pi-web-plugin.bypass_cached_release_data_and_check_the.b905ed4e"),
          group: t("pi-web-plugin.updates.8b356b23"),
          enabled: (context) => context.checkForPiWebUpdates !== undefined,
          disabledReason: () => t("pi-web-plugin.update_checks_require_a_newer_pi_web.2a598b9f"),
          run: (context) => context.checkForPiWebUpdates?.(),
        },
      ],
      applicationPanels: [
        {
          id: "workspace.updates",
          title: t("pi-web-plugin.updates.f1830542"),
          icon: svg`
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6v5h-5"></path>
              <path d="M4 18v-5h5"></path>
              <path d="M18.4 9A7 7 0 0 0 6.1 6.7L4 8.8"></path>
              <path d="M5.6 15A7 7 0 0 0 17.9 17.3L20 15.2"></path>
            </svg>
          `,
          order: 100,
          visible: (context) => shouldShowUpdatesPanel(context.state, runtimeHint),
          badge: (context) => {
            const count = messageCount(context.state);
            return count > 0 ? count : undefined;
          },
          render: (context) => renderUpdatesPanel(html, context.terminal, context.state),
        },
      ],
    },
  }),
} satisfies PiWebPlugin;

export default plugin;
