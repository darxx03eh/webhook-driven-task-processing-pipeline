import { Response } from 'express';
import { sendSuccessResponse } from '../utils/api-response';
import { AppError } from '../errors/app-error';
import type { WebhookRequest } from '../types/webhook-request';
import { ingestWebhookService } from '../services/webhook.service';
import { incrementMetric, recordDurationMetric } from '../../../shared/metrics/runtime-metrics.repository';
import { MetricKeys } from '../../../shared/metrics/metric-keys';

export const ingestWebhookHandler = async (req: WebhookRequest, res: Response) => {
    const startedAt = Date.now();
    await incrementMetric(MetricKeys.webhooksReceivedTotal, 1);

    try {
        const signature = req.header("X-Signature");
        const rawBody = req.rawBody;
        if (!rawBody)
            throw new AppError("Missing raw request body", "INVALID_REQUEST_BODY", 400);
        if (!req.body || typeof req.body !== "object")
            throw new AppError("Invalid Json body", "INVALID_JSON_BODY", 400);
        const result = await ingestWebhookService({
            webhookPath: req.params.webhookPath as string,
            rawBody,
            payload: req.body,
            signature: signature || undefined
        });
        return sendSuccessResponse(
            res,
            "Webhook accepted for asynchronous processing",
            {
                job: {
                    id: result.job.id,
                    status: result.job.status,
                    createdAt: result.job.createdAt
                },
                pipeline: result.pipeline
            },
            202
        );
    } finally {
        await recordDurationMetric(MetricKeys.webhookIngestDurationMs, Date.now() - startedAt);
    }
};
