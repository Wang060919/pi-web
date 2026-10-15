import { t } from "./i18n.js";
// Skeleton of a PI WEB plugin: metadata plus contribution definitions.
//
// Everything the bundled Info panel and action actually render lives in
// infoInternals.ts. That file is replaceable implementation detail — when
// copying this plugin as a starting point, keep this file's shape and swap
// the internals for your own.

import type { PiWebPlugin } from "@jmfederico/pi-web/plugin-api";
import { copyDiagnostics, renderInfoPanel } from "./infoInternals.js";

const plugin = {
  apiVersion: 4,
  name: "Info Plugin",
  activate: ({ html, svg }) => ({
    contributions: {
      actions: [
        {
          id: "copy-diagnostics",
          title: t("pi-web-plugin.copy_pi_web_diagnostics.87241f21"),
          description: t("pi-web-plugin.copy_version_installation_and_status_details_for.87c3040a"),
          group: t("pi-web-plugin.info.57902ba5"),
          run: (context) => copyDiagnostics(context),
        },
      ],
      workspaceLabels: [
        {
          id: "workspace.kind-label",
          order: 100,
          items: (context) => [{ type: "text", text: context.workspace.provider?.pluginId ?? t("pi-web-plugin.folder.d09be788"), title: context.workspace.path }],
        },
      ],
      applicationPanels: [
        {
          id: "workspace.info",
          title: t("pi-web-plugin.info.61667373"),
          icon: svg`
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 11v5"></path>
              <path d="M12 8h.01"></path>
            </svg>
          `,
          order: 1000,
          render: (context) => renderInfoPanel(html, context),
        },
      ],
    },
  }),
} satisfies PiWebPlugin;

export default plugin;
