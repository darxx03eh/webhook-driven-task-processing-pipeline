import { db } from "../index"
import { deliveryAttempts } from "../schema"

type CreateDeliveryAttemptInput = {
    jobId: string;
    subscriberId: string;
    status: string;
    responseCode: number | null;
    attempt: number;
};

export const createDeliveryAttempt = async (input: CreateDeliveryAttemptInput) => {
    const [deliveryAttempt] = await db.insert(deliveryAttempts)
    .values({
        jobId: input.jobId,
        subscriberId: input.subscriberId,
        status: input.status,
        responseCode: input.responseCode ?? null,
        attempt: input.attempt,
    }).returning();
    return deliveryAttempt;
}