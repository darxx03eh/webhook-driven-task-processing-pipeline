import { findSubscribersByPipelineId } from "../../../shared/db/repositories/subscribers.repository";
import { createDeliveryAttempt } from "../../../shared/db/repositories/delivery-attempts.repository";
import { incrementMetric, recordDurationMetric } from "../../../shared/metrics/runtime-metrics.repository";
import { MetricKeys } from "../../../shared/metrics/metric-keys";

type DeliveryResultInput = {
    jobId: string;
    pipelineId: string;
    result: Record<string, unknown>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRY_DELAYS = [0, 5000, 15000];

const deliverToSingleSubscriber = async (
    jobId: string,
    pipelineId: string,
    subscriber: {
        id: string;
        url: string;
        secret?: string | null
    },
    result: Record<string, unknown>
) => {
    for (let index = 0; index < RETRY_DELAYS.length; index++) {
        const delay = RETRY_DELAYS[index];
        const attempt = index + 1;

        if (attempt > 1) {
            await incrementMetric(MetricKeys.deliveriesRetryTotal, 1);
        }

        if (delay > 0) await sleep(delay);

        const attemptStartedAt = Date.now();
        await incrementMetric(MetricKeys.deliveriesAttemptedTotal, 1);

        try {
            console.log(
                `[worker] Delivery job ${jobId} to subscriber ${subscriber.id}, attempt: ${attempt}`
            );

            const response = await fetch(subscriber.url, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    jobId,
                    pipelineId,
                    result
                })
            });

            const isSuccess = response.ok;
            await createDeliveryAttempt({
                jobId,
                subscriberId: subscriber.id,
                status: isSuccess ? "success" : "failed",
                responseCode: response.status,
                attempt
            });

            if (isSuccess) {
                await incrementMetric(MetricKeys.deliveriesSuccessTotal, 1);
                console.log(
                    `[worker] Delivery succeeded for subscriber ${subscriber.id} on attempt: ${attempt}`
                );
                break;
            }

            await incrementMetric(MetricKeys.deliveriesFailedTotal, 1);
            console.log(
                `[worker] Delivery failed with HTTP ${response.status} for subscriber ${subscriber.id} on attempt: ${attempt}`
            );
        } catch {
            await createDeliveryAttempt({
                jobId,
                subscriberId: subscriber.id,
                status: "failed",
                responseCode: null,
                attempt
            });

            await incrementMetric(MetricKeys.deliveriesFailedTotal, 1);
            console.log(
                `[worker] Delivery failed for subscriber ${subscriber.id} on attempt: ${attempt}`
            );
        } finally {
            await recordDurationMetric(MetricKeys.deliveryAttemptDurationMs, Date.now() - attemptStartedAt);
        }
    }
};

export const deliverResultToSubscribers = async (input: DeliveryResultInput) => {
    const subscribers = await findSubscribersByPipelineId(input.pipelineId);
    for (const subscriber of subscribers) {
        await deliverToSingleSubscriber(
            input.jobId,
            input.pipelineId,
            {
                id: subscriber.id,
                url: subscriber.url,
                secret: subscriber.secret
            },
            input.result
        );
    }
};

