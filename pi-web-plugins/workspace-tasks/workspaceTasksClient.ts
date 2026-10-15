import { localizedText, t } from "./i18n.js";
import { TASKS_CONFIG_PATH, parseTasksConfigText, type WorkspaceTasksConfig } from "./config.js";

export const tasksConfigMissingMessage = t("workspaceTasksClient.no_workspace_tasks_configured_here.09a35f90");
export const tasksConfigMissingHint = localizedText("workspaceTasksClient.is_optional_create_it_in_this_workspace.892b9b71")`${TASKS_CONFIG_PATH} is optional. Create it in this workspace if you want custom tasks.`;
export const tasksConfigUnavailableMessage = t("workspaceTasksClient.could_not_load_workspace_tasks.c4848149");
export const tasksConfigRefreshHint = localizedText("workspaceTasksClient.fix_then_click_refresh.e0b17ea2")`Fix ${TASKS_CONFIG_PATH}, then click Refresh.`;

const missingWorkspaceFileError = "Path does not exist";

export interface WorkspaceTasksFileReader {
  readFile(path: string): Promise<WorkspaceTasksFileContent>;
}

interface WorkspaceTasksFileContent {
  content: string;
  truncated: boolean;
  binary: boolean;
}

export type WorkspaceTasksConfigLoadResult =
  | { kind: "loaded"; config: WorkspaceTasksConfig; path: string }
  | { kind: "missing"; message: string; hint: string }
  | { kind: "unavailable"; message: string; hint: string; detail?: string };

export async function loadWorkspaceTasksConfig(files: WorkspaceTasksFileReader): Promise<WorkspaceTasksConfigLoadResult> {
  let file: WorkspaceTasksFileContent;
  try {
    file = await files.readFile(TASKS_CONFIG_PATH);
  } catch (error) {
    if (errorMessage(error) === missingWorkspaceFileError) return missing();
    return unavailable(localizedText("workspaceTasksClient.unable_to_read.9272abf3")`Unable to read ${TASKS_CONFIG_PATH}: ${formatUnknownError(error)}`);
  }

  if (file.binary) return unavailable(localizedText("workspaceTasksClient.must_be_a_text_file.93f312bf")`${TASKS_CONFIG_PATH} must be a text file`);
  if (file.truncated) return unavailable(localizedText("workspaceTasksClient.is_too_large_and_was_truncated.cf746f11")`${TASKS_CONFIG_PATH} is too large and was truncated`);

  const result = parseTasksConfigText(file.content);
  if (!result.ok) return unavailable(result.error);
  return { kind: "loaded", config: result.config, path: TASKS_CONFIG_PATH };
}

function missing(): WorkspaceTasksConfigLoadResult {
  return {
    kind: "missing",
    message: tasksConfigMissingMessage,
    hint: tasksConfigMissingHint,
  };
}

function unavailable(detail: string): WorkspaceTasksConfigLoadResult {
  return {
    kind: "unavailable",
    message: tasksConfigUnavailableMessage,
    hint: tasksConfigRefreshHint,
    detail,
  };
}

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
