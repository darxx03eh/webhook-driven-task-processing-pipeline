import { AppError } from "../errors/app-error";
import { createJob } from "../../../shared/db/repositories/jobs.repository";
import { findPipelineByWebhookPath } from "../../../shared/db/repositories/pipelines.repository";
import { verifyWebhookSignature } from "../utils/webhook-signature";
import { incrementMetric } from "../../../shared/metrics/runtime-metrics.repository";
import { MetricKeys } from "../../../shared/metrics/metric-keys";

type IngestWebhookInput = {
    webhookPath: string;
    rawBody: string;
    payload: unknown;
    signature?: string;
};

export const ingestWebhookService = async (input: IngestWebhookInput) => {
    const pipeline = await findPipelineByWebhookPath(input.webhookPath);
    if (!pipeline)
        throw new AppError("Pipeline not found for the given webhook path", "PIPELINE_NOT_FOUND", 404);

    if (!input.signature) {
        await incrementMetric(MetricKeys.webhooksInvalidSignatureTotal, 1);
        throw new AppError("Missing webhook signature", "MISSING_SIGNATURE", 401);
    }

    const isValidSignature = verifyWebhookSignature(input.rawBody, pipeline.webhookSecret, input.signature);
    if (!isValidSignature) {
        await incrementMetric(MetricKeys.webhooksInvalidSignatureTotal, 1);
        throw new AppError("Invalid webhook signature", "INVALID_SIGNATURE", 401);
    }

    const job = await createJob({
        pipelineId: pipeline.id,
        payload: input.payload,
    });

    return {
        job,
        pipeline: {
            id: pipeline.id,
            name: pipeline.name,
            webhookPath: pipeline.webhookPath,
        }
    };
};
