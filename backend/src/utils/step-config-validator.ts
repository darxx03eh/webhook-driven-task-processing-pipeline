import { AppError } from "../errors/app-error";

const FILTER_OPERATORS = [">", "<", ">=", "<=", "==", "!="] as const;
const STEP_TYPES = ["filter", "transform", "enrich_http"] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const ensureNoUnknownKeys = (
  config: Record<string, unknown>,
  allowedKeys: string[],
  stepType: string,
) => {
  const unknownKeys = Object.keys(config).filter(
    (key) => !allowedKeys.includes(key),
  );
  if (unknownKeys.length > 0) {
    throw new AppError(
      `Invalid ${stepType} stepConfig keys`,
      "INVALID_STEP_CONFIG",
      400,
      { unknownKeys, allowedKeys },
    );
  }
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const validateFilterConfig = (stepConfig: unknown) => {
  if (!isPlainObject(stepConfig)) {
    throw new AppError(
      "filter stepConfig must be an object",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  ensureNoUnknownKeys(stepConfig, ["field", "operator", "value"], "filter");

  const field = stepConfig.field;
  const operator = stepConfig.operator;

  if (!isNonEmptyString(field)) {
    throw new AppError(
      "filter.field must be a non-empty string",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  if (
    typeof operator !== "string" ||
    !FILTER_OPERATORS.includes(operator as (typeof FILTER_OPERATORS)[number])
  ) {
    throw new AppError(
      "filter.operator is invalid",
      "INVALID_STEP_CONFIG",
      400,
      {
        allowedOperators: FILTER_OPERATORS,
      },
    );
  }

  if (!("value" in stepConfig) || stepConfig.value === undefined) {
    throw new AppError("filter.value is required", "INVALID_STEP_CONFIG", 400);
  }
};

const validateTransformRename = (rename: unknown) => {
  if (rename === undefined) return false;
  if (!isPlainObject(rename)) {
    throw new AppError(
      "transform.rename must be an object",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  const entries = Object.entries(rename);
  if (entries.length === 0) {
    throw new AppError(
      "transform.rename must include at least one key",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  for (const [fromKey, toKey] of entries) {
    if (!isNonEmptyString(fromKey) || !isNonEmptyString(toKey)) {
      throw new AppError(
        "transform.rename keys and values must be non-empty strings",
        "INVALID_STEP_CONFIG",
        400,
      );
    }
  }

  return true;
};

const validateTransformAdd = (add: unknown) => {
  if (add === undefined) return false;
  if (!isPlainObject(add)) {
    throw new AppError(
      "transform.add must be an object",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  if (Object.keys(add).length === 0) {
    throw new AppError(
      "transform.add must include at least one key",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  return true;
};

const validateTransformRemove = (remove: unknown) => {
  if (remove === undefined) return false;

  if (!Array.isArray(remove)) {
    throw new AppError(
      "transform.remove must be an array",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  if (remove.length === 0) {
    throw new AppError(
      "transform.remove must include at least one field",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  if (!remove.every((item) => isNonEmptyString(item))) {
    throw new AppError(
      "transform.remove items must be non-empty strings",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  return true;
};

const validateTransformConfig = (stepConfig: unknown) => {
  if (!isPlainObject(stepConfig)) {
    throw new AppError(
      "transform stepConfig must be an object",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  ensureNoUnknownKeys(stepConfig, ["rename", "add", "remove"], "transform");

  const hasRename = validateTransformRename(stepConfig.rename);
  const hasAdd = validateTransformAdd(stepConfig.add);
  const hasRemove = validateTransformRemove(stepConfig.remove);

  if (!hasRename && !hasAdd && !hasRemove) {
    throw new AppError(
      "transform stepConfig must include at least one of: rename, add, remove",
      "INVALID_STEP_CONFIG",
      400,
    );
  }
};

const validateEnrichHttpConfig = (stepConfig: unknown) => {
  if (!isPlainObject(stepConfig)) {
    throw new AppError(
      "enrich_http stepConfig must be an object",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  ensureNoUnknownKeys(
    stepConfig,
    ["url", "method", "timeoutMs"],
    "enrich_http",
  );

  const url = stepConfig.url;
  const method = stepConfig.method;
  const timeoutMs = stepConfig.timeoutMs;

  if (!isNonEmptyString(url)) {
    throw new AppError(
      "enrich_http.url must be a non-empty string",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  if (!/^https?:\/\//i.test(url.trim())) {
    throw new AppError(
      "enrich_http.url must start with http:// or https://",
      "INVALID_STEP_CONFIG",
      400,
    );
  }

  if (method !== undefined && method !== "GET") {
    throw new AppError(
      "enrich_http.method currently supports only GET",
      "INVALID_STEP_CONFIG",
      400,
      {
        allowedMethods: ["GET"],
      },
    );
  }

  if (timeoutMs !== undefined) {
    if (
      !Number.isInteger(timeoutMs) ||
      Number(timeoutMs) < 1 ||
      Number(timeoutMs) > 120000
    ) {
      throw new AppError(
        "enrich_http.timeoutMs must be an integer between 1 and 120000",
        "INVALID_STEP_CONFIG",
        400,
      );
    }
  }
};

export const validateStepType = (stepType: string) => {
  if (!STEP_TYPES.includes(stepType as (typeof STEP_TYPES)[number])) {
    throw new AppError("Invalid step type", "INVALID_STEP_TYPE", 400, {
      allowedTypes: STEP_TYPES,
    });
  }
};

export const validateStepConfigByType = (
  stepType: string,
  stepConfig: unknown,
) => {
  switch (stepType) {
    case "filter":
      validateFilterConfig(stepConfig);
      return;
    case "transform":
      validateTransformConfig(stepConfig);
      return;
    case "enrich_http":
      validateEnrichHttpConfig(stepConfig);
      return;
    default:
      throw new AppError("Invalid step type", "INVALID_STEP_TYPE", 400, {
        allowedTypes: STEP_TYPES,
      });
  }
};
