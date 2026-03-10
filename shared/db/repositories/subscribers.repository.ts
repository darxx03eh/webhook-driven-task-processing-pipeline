import { and, asc, eq } from 'drizzle-orm';
import { db } from '../index';
import { pipelines, subscribers } from '../schema';

type CreateSubscriberInput = {
    pipelineId: string;
    url: string;
    secret?: string | null;
};

export const findPipelineOwnedByUserForSubscribers = async (pipelineId: string, userId: string) => {
    return db.query.pipelines.findFirst({
        where: and(
            eq(pipelines.id, pipelineId),
            eq(pipelines.userId, userId)
        )
    });
}

export const createSubscriber = async (input: CreateSubscriberInput) => {
    const [subscriber] = await db.insert(subscribers)
    .values({
        pipelineId: input.pipelineId,
        url: input.url,
        secret: input.secret ?? null
    }).returning();
    return subscriber;
}

export const findSubscribersByPipelineId = async (pipelineId: string) => {
    return db.query.subscribers.findMany({
        where: eq(subscribers.pipelineId, pipelineId),
        orderBy: [asc(subscribers.createdAt)]
    });
}

export const findSubscriberByIdWithPipeline = async (subscriberId: string) => {
    return db.query.subscribers.findFirst({
        where: eq(subscribers.id, subscriberId),
        with: {
            pipeline: true
        }
    });
}

export const deleteSubscriberById = async (subscriberId: string) => {
    const [deletedSubscriber] = await db.delete(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .returning();
    return deletedSubscriber;
}