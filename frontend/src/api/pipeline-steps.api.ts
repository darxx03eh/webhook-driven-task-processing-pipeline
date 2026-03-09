import { apiClient } from "./client";

export type StepType = "filter" | "transform" | "enrich_http";

export type PipelineStep = {
    id: string;
    pipelineId: string;
    stepOrder: number;
    stepType: StepType;
    stepConfig: unknown;
    createdAt: string;
};

export type SavePipelineStepPayload = {
    stepOrder: number;
    stepType: StepType;
    stepConfig: unknown;
};

export const getPipelineStepsRequest = async (pipelineId: string): Promise<PipelineStep[]> => {
    const response = await apiClient.get(`/pipelines/${pipelineId}/steps`);
    return response.data.data.steps as PipelineStep[];
};

export const createPipelineStepRequest = async (
    pipelineId: string,
    payload: SavePipelineStepPayload
): Promise<PipelineStep> => {
    const response = await apiClient.post(`/pipelines/${pipelineId}/steps`, payload);
    return response.data.data.step as PipelineStep;
};

export const updatePipelineStepRequest = async (
    stepId: string,
    payload: SavePipelineStepPayload
): Promise<PipelineStep> => {
    const response = await apiClient.put(`/pipeline-steps/${stepId}`, payload);
    return response.data.data.step as PipelineStep;
};

export const deletePipelineStepRequest = async (stepId: string): Promise<void> => {
    await apiClient.delete(`/pipeline-steps/${stepId}`);
};
