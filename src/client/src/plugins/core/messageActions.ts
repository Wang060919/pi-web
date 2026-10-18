import { roleDisplayLabel, localizedText, t } from "../../../../shared/i18n";
import { renderUiIcon } from "../../components/uiIcons";
import type { MessageActionAvailabilityContext, MessageActionContribution } from "../../../../plugin-api";
import { writeClipboardText } from "../../clipboard";
import { renderCopyIcon, renderGoBackIcon } from "../../components/messageActionIcons";

export function createCoreMessageActions(writeText = writeClipboardText): MessageActionContribution[] {
  const historyAction = {
    visible: ({ message }: MessageActionAvailabilityContext) => message.role === "user" || message.role === "assistant",
    enabled: ({ session }: MessageActionAvailabilityContext) => !session.archived && !session.pending && !session.busy,
  };
  return [{
    ...historyAction,
    id: "message.fork",
    title: t("messageActions.clone_session_from_this_message.9626ddbf"),
    icon: renderUiIcon("fork"),
    run: async ({ history }) => {
      if (window.confirm(t("messageActions.are_you_sure_you_want_to_fork.bd452d07"))) await history.fork();
    },
  }, {
    ...historyAction,
    id: "message.back",
    title: t("messageActions.go_back_to_this_message.d44041bf"),
    icon: renderGoBackIcon(),
    run: ({ history }) => history.goBack(),
  }, {
    target: "display",
    id: "message.copy",
    title: t("messageActions.copy_message.f3147506"),
    ariaLabel: ({ message }) => localizedText("messageActions.copy_message.caa2c0f2")`Copy ${roleDisplayLabel(message.role)} message`,
    icon: renderCopyIcon(),
    visible: ({ message }) => (message.role === "user" || message.role === "assistant") && message.text !== "",
    run: async ({ message }) => {
      if (!await writeText(message.text)) throw new Error(t("messageActions.unable_to_copy_message_to_the_clipboard.21bce1a6"));
      return { title: t("messageActions.copied.3064c989"), ariaLabel: localizedText("messageActions.copied_message.eb473c93")`Copied ${roleDisplayLabel(message.role)} message`, icon: renderUiIcon("check") };
    },
  }];
}
