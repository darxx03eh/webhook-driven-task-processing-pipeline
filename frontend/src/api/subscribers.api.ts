import { apiClient } from "./client";

export type Subscriber = {
    id: string;
    pipelineId: string;
    url: string;
    secret: string | null;
    createdAt: string;
};

export const getSubscribersRequest = async (pipelineId: string): Promise<Subscriber[]> => {
    const response = await apiClient.get(`/pipelines/${pipelineId}/subscribers`);
    return response.data.data.subscribers as Subscriber[];
};

export const createSubscriberRequest = async (
    pipelineId: string,
    payload: { url: string; secret?: string }
): Promise<Subscriber> => {
    const response = await apiClient.post(`/pipelines/${pipelineId}/subscribers`, payload);
    return response.data.data.subscriber as Subscriber;
};

export const deleteSubscriberRequest = async (subscriberId: string): Promise<void> => {
    await apiClient.delete(`/subscribers/${subscriberId}`);
};
