import type { SessionContextSources } from "../../shared/apiTypes.js";

/** Narrow view shared by current SDK resource loaders and older runtimes. */
export interface RuntimeContextResourceLoader {
  getSkills(): {
    skills: readonly {
      name: string;
      description?: string;
      filePath?: string;
      disableModelInvocation?: boolean;
    }[];
  };
  getAgentsFiles?(): { agentsFiles: readonly { path: string }[] };
  getSystemPromptSource?(): { path: string } | undefined;
  getAppendSystemPromptSources?(): readonly { path: string }[];
}

/**
 * Project only metadata already held by the runtime. Do not discover files or
 * read prompt bodies here: trust/resource resolution belongs to the SDK loader.
 */
export function sessionContextSources(loader: RuntimeContextResourceLoader): SessionContextSources {
  const agents = loader.getAgentsFiles?.().agentsFiles;
  const result: SessionContextSources = {
    source: "runtime-resource-loader",
    availableSkills: loader.getSkills().skills.map((skill) => ({
      name: skill.name,
      ...(skill.filePath === undefined ? {} : { path: skill.filePath }),
      ...(skill.description === undefined ? {} : { description: skill.description }),
      ...(skill.disableModelInvocation === undefined ? {} : { modelInvocation: !skill.disableModelInvocation }),
    })),
    ...(agents === undefined ? {} : { agentFiles: agents.map(({ path }) => ({ path })) }),
  };
  // Reporting a partial list as complete would hide unsupported custom prompt
  // sources. Older SDKs keep this collection unknown until both getters exist.
  if (loader.getSystemPromptSource !== undefined && loader.getAppendSystemPromptSources !== undefined) {
    const system = loader.getSystemPromptSource();
    result.systemPromptFiles = [
      ...(system === undefined ? [] : [{ path: system.path, kind: "system" as const }]),
      ...loader.getAppendSystemPromptSources().map(({ path }) => ({ path, kind: "append-system" as const })),
    ];
  }
  return result;
}
