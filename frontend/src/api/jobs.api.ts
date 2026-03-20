import { apiClient } from "./client";

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "filtered_out";

export type DeliveryAttempt = {
    id: string;
    jobId: string;
    subscriberId: string;
    status: string;
    responseCode: number | null;
    attempt: number;
    createdAt: string;
};

export type JobPipeline = {
    id: string;
    name: string;
    webhookPath: string;
    webhookSecret: string;
    userId: string;
    createdAt: string;
};

export type JobStepSnapshot = {
    id: string;
    stepOrder: number;
    stepType: string;
    stepConfig: unknown;
};

export type Job = {
    id: string;
    pipelineId: string;
    payload: unknown;
    status: JobStatus;
    attempts: number;
    result: unknown;
    stepsSnapshot: JobStepSnapshot[] | null;
    error: string | null;
    stopReason: string | null;
    createdAt: string;
    processedAt: string | null;
    pipeline?: JobPipeline;
    deliveryAttempts?: DeliveryAttempt[];
};

export const getJobsRequest = async (): Promise<Job[]> => {
    const response = await apiClient.get("/jobs");
    return response.data.data.jobs as Job[];
};

export const getJobByIdRequest = async (jobId: string): Promise<Job> => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data.data.job as Job;
};

export const getPipelineJobsRequest = async (pipelineId: string): Promise<Job[]> => {
    const response = await apiClient.get(`/pipelines/${pipelineId}/jobs`);
    return response.data.data.jobs as Job[];
};
