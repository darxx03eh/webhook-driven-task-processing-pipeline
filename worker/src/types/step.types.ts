export type FilterStepConfig = {
  field: string;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  value: unknown;
};

export type TransformStepConfig = {
  rename?: Record<string, string>;
  add?: Record<string, unknown>;
  remove?: string[];
};

export type EnrichHttpStepConfig = {
  url: string;
  method?: "GET";
  timeoutMs?: number;
};

export type StepExecutionResult =
  | {
      stopped: true;
      status: "filterd_out";
      stopReason: string;
      payload: Record<string, unknown>;
    }
  | {
      stopped: false;
      payload: Record<string, unknown>;
    };
