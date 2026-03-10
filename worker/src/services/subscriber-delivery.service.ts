import { findSubscribersByPipelineId } from "../../../shared/db/repositories/subscribers.repository";
import { createDeliveryAttempt } from "../../../shared/db/repositories/delivery-attempts.repository";

type DeliveryResultInput = {
    jobId: string;
    pipelineId: string;
    result: Record<string, unknown>;
};

export const deliverResultToSubscribers = async (input: DeliveryResultInput) => {
    const subscribers = await findSubscribersByPipelineId(input.pipelineId);
    for (const subscriber of subscribers) {
        try {
            const response = await fetch(subscriber.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jobId: input.jobId,
                    pipelineId: input.pipelineId,
                    result: input.result,
                })
            });
            await createDeliveryAttempt({
                jobId: input.jobId,
                subscriberId: subscriber.id,
                status: response.ok ? "success" : "failed",
                responseCode: response.status,
                attempt: 1
            })
        } catch(err) {
            console.error(`Failed to deliver result to subscriber ${subscriber.id} at ${subscriber.url}:`, err);
            await createDeliveryAttempt({
                jobId: input.jobId,
                subscriberId: subscriber.id,
                status: "failed",
                responseCode: null,
                attempt: 1
            });
        }   
    }
}