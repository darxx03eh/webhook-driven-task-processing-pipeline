import { apiClient } from "./client";

export type IngestWebhookResult = {
    job: {
        id: string;
        status: string;
        createdAt: string;
    };
    pipeline: {
        id: string;
        name: string;
        webhookPath: string;
    };
};

export const ingestWebhookRequest = async (
    webhookPath: string,
    payloadText: string,
    signature: string
): Promise<IngestWebhookResult> => {
    const response = await apiClient.post(`/webhooks/${webhookPath}`, payloadText, {
        headers: {
            "Content-Type": "application/json",
            "X-Signature": signature,
        },
        transformRequest: [
            (data) => data,
        ],
    });

    return response.data.data as IngestWebhookResult;
};
