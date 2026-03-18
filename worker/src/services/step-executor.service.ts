import type {
  EnrichHttpStepConfig,
  FilterStepConfig,
  StepExecutionResult,
  TransformStepConfig,
} from "../types/step.types";
import type { PipelineStep } from "../types/pipeline-step.types";

const compareValues = (
  left: unknown,
  operator: string,
  right: unknown,
): boolean => {
  switch (operator) {
    case ">":
      return Number(left) > Number(right);
    case "<":
      return Number(left) < Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<=":
      return Number(left) <= Number(right);
    case "==":
      return left == right;
    case "!=":
      return left != right;
    default:
      throw new Error(`Unsupported filter operator: ${operator}`);
  }
};

const applyFilterStep = (
  payload: Record<string, unknown>,
  config: FilterStepConfig,
): StepExecutionResult => {
  const actualValue = payload[config.field];
  const passed = compareValues(actualValue, config.operator, config.value);
  if (!passed)
    return {
      stopped: true,
      status: "filterd_out",
      stopReason: `Filter condition failed: ${config.field} ${config.operator} ${String(config.value)}`,
      payload,
    };
  return {
    stopped: false,
    payload,
  };
};

const applyTransformStep = (
  payload: Record<string, unknown>,
  config: TransformStepConfig,
): Record<string, unknown> => {
  const nextPayload = { ...payload };
  if (config.rename) {
    for (const [oldKey, newKey] of Object.entries(config.rename)) {
      if (oldKey in nextPayload) {
        nextPayload[newKey] = nextPayload[oldKey];
        delete nextPayload[oldKey];
      }
    }
  }
  if (config.add)
    for (const [key, value] of Object.entries(config.add))
      nextPayload[key] = value;
  if (config.remove) for (const key of config.remove) delete nextPayload[key];
  return nextPayload;
};

const interpolateUrl = (
  template: string,
  payload: Record<string, unknown>,
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = payload[key];
    return value === undefined || value === null ? "" : String(value);
  });
};

const applyEnrichHttpStep = async (
  payload: Record<string, unknown>,
  config: EnrichHttpStepConfig,
): Promise<Record<string, unknown>> => {
  const url = interpolateUrl(config.url, payload);
  const controller = new AbortController();
  const timeoutMs = config.timeoutMs ?? 5000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: config.method ?? "GET",
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(
        `Enrichment request failed with status ${response.status}`,
      );
    const data = (await response.json()) as Record<string, unknown>;
    return {
      ...payload,
      ...data,
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const executePipelineSteps = async (
  initialPayload: Record<string, unknown>,
  steps: PipelineStep[],
): Promise<StepExecutionResult> => {
  let currentPayload: Record<string, unknown> = { ...initialPayload };
  for (const step of steps) {
    switch (step.stepType) {
      case "filter": {
        const result = applyFilterStep(
          currentPayload,
          step.stepConfig as FilterStepConfig,
        );
        if (result.stopped) return result;
        currentPayload = result.payload;
        break;
      }
      case "transform": {
        currentPayload = applyTransformStep(
          currentPayload,
          step.stepConfig as TransformStepConfig,
        );
        break;
      }
      case "enrich_http": {
        currentPayload = await applyEnrichHttpStep(
          currentPayload,
          step.stepConfig as EnrichHttpStepConfig,
        );
        break;
      }
      default:
        throw new Error(`Unsupported step type: ${step.stepType}`);
    }
  }
  return {
    stopped: false,
    payload: currentPayload,
  };
};
