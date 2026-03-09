import { apiClient } from "./client";

export type Pipeline = {
    id: string;
    userId: string;
    name: string;
    webhookPath: string;
    webhookSecret: string;
    createdAt: string;
};

export const getPipelinesRequest = async (): Promise<Pipeline[]> => {
    const response = await apiClient.get("/pipelines");
    return response.data.data.pipelines as Pipeline[];
};

export const createPipelineRequest = async (payload: { name: string }): Promise<Pipeline> => {
    const response = await apiClient.post("/pipelines", payload);
    return response.data.data.pipeline as Pipeline;
};

export const getPipelineByIdRequest = async (pipelineId: string): Promise<Pipeline> => {
    const response = await apiClient.get(`/pipelines/${pipelineId}`);
    return response.data.data.pipeline as Pipeline;
};

export const deletePipelineRequest = async (pipelineId: string): Promise<void> => {
    await apiClient.delete(`/pipelines/${pipelineId}`);
};
