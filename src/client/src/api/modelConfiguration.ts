import {
  parseModelConfigurationResponse, parseModelConnectionResult, parseModelDiscoveryResult,
  type ConfiguredProvider, type ModelConfigurationResponse,
} from "../../../shared/modelConfiguration";
import { request } from "./http";

/** request() resolves this application-relative reference exactly once. */
export function modelConfigurationPath(machineId = "local", action?: "discover" | "test"): string {
  return `api/machines/${encodeURIComponent(machineId)}/models/configuration${action === undefined ? "" : `/${action}`}`;
}

export const modelConfigurationApi = {
  read: (machineId: string, signal?: AbortSignal) => request(modelConfigurationPath(machineId), parseModelConfigurationResponse, { cache: "no-store", ...(signal === undefined ? {} : { signal }) }),
  write: (configuration: ModelConfigurationResponse, machineId: string, signal?: AbortSignal) => request(modelConfigurationPath(machineId), parseModelConfigurationResponse, { method: "PUT", body: JSON.stringify(configuration), ...(signal === undefined ? {} : { signal }) }),
  discover: (provider: ConfiguredProvider, machineId: string, signal?: AbortSignal) => request(modelConfigurationPath(machineId, "discover"), parseModelDiscoveryResult, { method: "POST", body: JSON.stringify({ provider }), ...(signal === undefined ? {} : { signal }) }),
  test: (provider: ConfiguredProvider, modelId: string, machineId: string, signal?: AbortSignal) => request(modelConfigurationPath(machineId, "test"), parseModelConnectionResult, { method: "POST", body: JSON.stringify({ provider, modelId }), ...(signal === undefined ? {} : { signal }) }),
};
