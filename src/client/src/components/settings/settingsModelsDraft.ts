import { t } from "../../../../shared/i18n";
import { parseConfiguredProvider, type ConfiguredProvider, type ConfiguredModel } from "../../../../shared/modelConfiguration";

export interface ModelEditorDraft {
  id: string; name: string; api: string; baseUrl: string;
  headers: string; cost: string; thinkingLevelMap: string;
  contextWindow: string; maxTokens: string;
  reasoning: boolean; imageInput: boolean; override: boolean;
  reasoningSet: boolean; inputSet: boolean;
}
export interface ProviderEditorDraft {
  id: string; baseUrl: string; api: string; apiKey: string; headers: string;
  models: ModelEditorDraft[];
}

export function modelEditorDraft(model: ConfiguredModel): ModelEditorDraft {
  return { id: model.id, name: model.name ?? "", api: model.api ?? "", baseUrl: model.baseUrl ?? "", headers: JSON.stringify(model.headers ?? {}, null, 2),
    cost: model.cost === undefined ? "" : JSON.stringify(model.cost, null, 2), thinkingLevelMap: model.thinkingLevelMap === undefined ? "" : JSON.stringify(model.thinkingLevelMap, null, 2),
    contextWindow: model.contextWindow === undefined ? "" : String(model.contextWindow), maxTokens: model.maxTokens === undefined ? "" : String(model.maxTokens),
    reasoning: model.reasoning ?? false, imageInput: model.input?.includes("image") ?? false, override: model.override ?? false,
    reasoningSet: model.reasoning !== undefined, inputSet: model.input !== undefined };
}

export function providerEditorDraft(provider: ConfiguredProvider): ProviderEditorDraft {
  return { id: provider.id, baseUrl: provider.baseUrl ?? "", api: provider.api ?? "", apiKey: provider.apiKey ?? "", headers: JSON.stringify(provider.headers ?? {}, null, 2), models: provider.models.map(modelEditorDraft) };
}

export class ModelDraftFieldError extends Error {
  constructor(readonly field: string, readonly modelIndex?: number) {
    const label = field.endsWith("headers") ? t("modelsSettings.headers") : field === "model-cost" ? t("modelsSettings.cost") : t("modelsSettings.thinkingMap");
    super(`${label}: ${t("modelsSettings.invalidJson")}`);
  }
}

function jsonField(text: string, field: string, modelIndex?: number): unknown {
  try { const value: unknown = JSON.parse(text === "" ? "{}" : text); return value; }
  catch { throw new ModelDraftFieldError(field, modelIndex); }
}

export function providerFromEditorDraft(draft: ProviderEditorDraft): ConfiguredProvider {
  const model = (row: ModelEditorDraft, modelIndex: number): Record<string, unknown> => ({ id: row.id.trim(),
    ...(row.name.trim() === "" ? {} : { name: row.name.trim() }), ...(row.api.trim() === "" ? {} : { api: row.api.trim() }), ...(row.baseUrl.trim() === "" ? {} : { baseUrl: row.baseUrl.trim() }),
    headers: jsonField(row.headers, "model-headers", modelIndex), ...(row.reasoningSet ? { reasoning: row.reasoning } : {}), ...(row.inputSet ? { input: row.imageInput ? ["text", "image"] : ["text"] } : {}), override: row.override,
    ...(row.contextWindow.trim() === "" ? {} : { contextWindow: Number(row.contextWindow) }), ...(row.maxTokens.trim() === "" ? {} : { maxTokens: Number(row.maxTokens) }),
    ...(row.cost.trim() === "" ? {} : { cost: jsonField(row.cost, "model-cost", modelIndex) }), ...(row.thinkingLevelMap.trim() === "" ? {} : { thinkingLevelMap: jsonField(row.thinkingLevelMap, "model-thinking", modelIndex) }),
  });
  return parseConfiguredProvider({ id: draft.id.trim(), models: draft.models.map(model), headers: jsonField(draft.headers, "provider-headers"),
    ...(draft.baseUrl.trim() === "" ? {} : { baseUrl: draft.baseUrl.trim() }), ...(draft.api.trim() === "" ? {} : { api: draft.api.trim() }), ...(draft.apiKey.trim() === "" ? {} : { apiKey: draft.apiKey.trim() }) });
}
