export type CreatePipelineInput = {
  userId: string;
  name: string;
};

export type CreatePipelineStepInput = {
  pipelineId: string;
  userId: string;
  stepOrder: number;
  stepType: string;
  stepConfig: unknown;
};

export type UpdatePipelineStepInput = {
  stepId: string;
  userId: string;
  stepOrder: number;
  stepType: string;
  stepConfig: unknown;
};
