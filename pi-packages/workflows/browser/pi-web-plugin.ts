import { t } from "./i18n.js";
import type { PiWebPlugin, PluginRuntimeContext } from "@wang060919/pi-web/plugin-api";

type WorktreePromptContext = Pick<PluginRuntimeContext, "state" | "prompt" | "focusPrompt">;

function canPrepareWorktreePrompt({ state, prompt }: Pick<WorktreePromptContext, "state" | "prompt">): boolean {
  const session = state.selectedSession;
  return state.mainView === "chat"
    && state.selectedWorkspace !== undefined
    && session !== undefined
    && !session.archived
    && !session.pending
    && prompt.getText() === "";
}

const plugin = {
  apiVersion: 4,
  name: "Workflows",
  activate: () => ({
    contributions: {
      actions: [{
        id: "worktree.create",
        title: t("pi-web-plugin.create_worktree.46433ba1"),
        description: t("pi-web-plugin.prepare_worktree_describe_its_purpose_and_or.1ed5b8ff"),
        group: t("pi-web-plugin.workflows.8abe73c8"),
        enabled: canPrepareWorktreePrompt,
        disabledReason: () => t("pi-web-plugin.select_an_active_conversation_in_chat_with.784472bd"),
        run: (context: WorktreePromptContext) => {
          if (!canPrepareWorktreePrompt(context)) return;
          context.focusPrompt();
          context.prompt.insertText("/worktree ");
        },
      }],
    },
  }),
} satisfies PiWebPlugin;

export default plugin;
