import { t } from "../../../../shared/i18n";
import { isSessionActive } from "../../../../shared/activity";
import type { AppState } from "../../appState";
import { isArchivableSessionInfo, isTransientNewSessionInfo } from "../../sessionPersistence";
import { canDeleteWorkspace, isWorkspaceDeletionPending } from "../../workspaceDeletion";
import type { PluginAction } from "../types";

export function createCoreActions(): PluginAction[] {
  return [
    {
      id: "actions.show",
      title: t("actions.show_actions.16f031e0"),
      description: t("actions.open_the_command_palette.ed5bc715"),
      shortcut: "mod+k",
      group: t("actions.general.aab6fc30"),
      run: (context) => { context.openActionPalette(); },
    },
    {
      id: "prompt.focus",
      title: t("actions.focus_prompt.95dd8a2a"),
      description: t("actions.move_keyboard_focus_to_the_message_composer.8061da86"),
      shortcut: "mod+g c",
      group: t("actions.general.fe3d3d1e"),
      run: (context) => { context.focusPrompt(); },
    },
    {
      id: "machine.add",
      title: t("actions.add_machine.4bafe6e6"),
      description: t("actions.register_another_pi_web_runtime_reachable_from.35e1fecd"),
      group: t("actions.machine.048e2c5a"),
      run: (context) => context.addMachine(),
    },
    {
      id: "machine.refresh",
      title: t("actions.refresh_selected_machine.8a40a2db"),
      description: t("actions.check_whether_the_selected_pi_web_runtime.a4a46eb9"),
      group: t("actions.machine.dfdbb581"),
      run: (context) => context.refreshSelectedMachine(),
    },
    {
      id: "machine.open",
      title: t("actions.open_selected_machine_pi_web.9995f07d"),
      description: t("actions.open_the_selected_remote_pi_web_directly.f99665da"),
      group: t("actions.machine.3f05cd64"),
      enabled: (context) => context.state.selectedMachine?.kind === "remote" && context.state.selectedMachine.baseUrl !== undefined,
      run: (context) => context.openSelectedMachine(),
    },
    {
      id: "machine.remove",
      title: t("actions.remove_selected_machine.75497cbc"),
      description: t("actions.remove_the_selected_remote_machine_from_this.ca6b1d6d"),
      group: t("actions.machine.461ee431"),
      enabled: (context) => context.state.selectedMachine?.kind === "remote",
      run: (context) => context.removeSelectedMachine(),
    },
    {
      id: "project.add",
      title: t("actions.add_project.4a60c119"),
      group: t("actions.project.ed4e2811"),
      run: (context) => context.addProject(),
    },
    {
      id: "auth.login",
      title: t("actions.configure_provider_authentication.2ed9ab70"),
      description: t("actions.run_login_without_tying_authentication_to_a.7350c3ae"),
      group: t("actions.general.4a28eb0e"),
      run: (context) => context.configureAuth(),
    },
    {
      id: "auth.logout",
      title: t("actions.remove_provider_authentication.8c6be5d7"),
      description: t("actions.run_logout_for_stored_pi_credentials.b6eae4f6"),
      group: t("actions.general.d13363df"),
      run: (context) => context.logoutAuth(),
    },
    {
      id: "theme.select",
      title: t("actions.select_theme.1691df69"),
      description: t("actions.choose_the_pi_web_color_theme.8d40c8bb"),
      group: t("actions.preferences.cf6a379a"),
      run: (context) => { context.openThemePicker(); },
    },
    {
      id: "settings.open",
      title: t("actions.open_settings.92c49354"),
      description: t("actions.manage_pi_web_configuration_and_keyboard_shortcuts.044e9ced"),
      shortcut: "mod+,",
      group: t("actions.preferences.d2996294"),
      run: (context) => { context.piWebUnstable?.openSettings?.(); },
    },
    {
      id: "app.reload-page",
      title: t("actions.full_page_reload.3a887143"),
      description: t("actions.reload_the_pi_web_browser_page.7c4fd84f"),
      group: t("actions.general.60f84447"),
      run: (context) => { context.reloadPage(); },
    },
    {
      id: "view.chat",
      title: t("actions.go_to_chat.68fd294f"),
      shortcut: "mod+1",
      group: t("actions.navigation.13f63e98"),
      run: (context) => { context.focusPrompt(); },
    },
    {
      id: "workspace.delete",
      title: t("actions.remove_workspace.16f6abb1"),
      description: t("actions.run_the_owning_provider_s_workspace_removal.cd7c5df2"),
      group: t("actions.workspace.cce871f5"),
      enabled: hasDeletableWorkspace,
      run: (context) => context.deleteWorkspace(),
    },
    {
      id: "session.start",
      title: t("actions.start_session.220b9c40"),
      shortcut: "mod+enter",
      group: t("actions.session.70a8b6f5"),
      enabled: hasWorkspace,
      run: (context) => context.startSession(),
    },
    {
      id: "model.select",
      title: t("actions.select_model.4cc9080e"),
      description: t("actions.choose_the_model_for_the_selected_session.0018f3f7"),
      group: t("actions.session.78b9d11a"),
      enabled: hasSelectableSession,
      run: (context) => context.openModelPicker(),
    },
    {
      id: "thinking.select",
      title: t("actions.select_thinking_level.edf8d2db"),
      description: t("actions.choose_the_thinking_level_for_the_selected.5b621427"),
      group: t("actions.session.240625f7"),
      enabled: hasSelectableSession,
      run: (context) => context.openThinkingLevelPicker(),
    },
    {
      id: "session.archive",
      title: t("actions.archive_session.ff404bda"),
      description: t("actions.archive_the_selected_session.f26ff005"),
      group: t("actions.session.e6ba8c1e"),
      enabled: hasArchivableSession,
      run: (context) => context.archiveSession(),
    },
    {
      id: "session.reload",
      title: t("actions.reload_session_from_disk.9fc8e7de"),
      description: t("actions.close_and_re_open_the_selected_session.6eedf731"),
      group: t("actions.session.e4ee5769"),
      enabled: hasReloadableSession,
      run: (context) => context.reloadSession(),
    },
    {
      id: "session.delete",
      title: t("actions.delete_new_session.7d7dfab3"),
      description: t("actions.delete_the_selected_transient_new_session.84247e6b"),
      group: t("actions.session.92689c5e"),
      enabled: hasTransientNewSession,
      run: (context) => context.deleteCachedNewSession(),
    },
    {
      id: "session.stop",
      title: t("actions.stop_active_work.bdab995e"),
      shortcut: "mod+.",
      group: t("actions.session.3e1026ef"),
      enabled: (context) => context.state.selectedSession !== undefined && isSessionActive(context.state.status, context.state.activity),
      run: (context) => context.stopActiveWork(),
    },
  ];
}

function hasWorkspace(context: { state: AppState }): boolean {
  return context.state.selectedWorkspace !== undefined;
}

function hasDeletableWorkspace(context: { state: AppState }): boolean {
  const workspace = context.state.selectedWorkspace;
  return canDeleteWorkspace(workspace) && !isWorkspaceDeletionPending(context.state, workspace);
}

function hasSelectableSession(context: { state: AppState }): boolean {
  const session = context.state.selectedSession;
  return session !== undefined && session.archived !== true;
}

function hasArchivableSession(context: { state: AppState }): boolean {
  return isArchivableSessionInfo(context.state.selectedSession, context.state.status);
}

function hasTransientNewSession(context: { state: AppState }): boolean {
  return isTransientNewSessionInfo(context.state.selectedSession, context.state.status);
}

function hasReloadableSession(context: { state: AppState }): boolean {
  if (!isArchivableSessionInfo(context.state.selectedSession, context.state.status)) return false;
  return !isSessionActive(context.state.status, context.state.activity);
}
