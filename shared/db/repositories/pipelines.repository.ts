import { and, desc, eq} from 'drizzle-orm';
import { db } from '../index';
import { pipelines } from '../schema';
import { pipeline } from 'node:stream';


type CreatePipelineInput = {
    userId: string;
    name: string;
    webhookPath: string;
    webhookSecret: string;
};

export const createPipeline = async (input: CreatePipelineInput) => {
    const [pipeline] = await db.insert(pipelines)
    .values({
        userId: input.userId,
        name: input.name,
        webhookPath: input.webhookPath,
        webhookSecret: input.webhookSecret
    }).returning({
        id: pipelines.id,
        userId: pipelines.userId,
        name: pipelines.name,
        webhookPath: pipelines.webhookPath,
        webhookSecret: pipelines.webhookSecret,
        createdAt: pipelines.createdAt
    });
    return pipeline;
}

export const findPipelinesByUserId = async (userId: string) => {
    return db.query.pipelines.findMany({
        where: eq(pipelines.userId, userId),
        orderBy: desc(pipelines.createdAt)
    });
}

export const findPipelineByIdAndUserId = async (pipelineId: string, userId: string) => {
    return db.query.pipelines.findFirst({
        where: and(
            eq(pipelines.id, pipelineId),
            eq(pipelines.userId, userId)
        )
    });
}

export const deletePipelineByIdAndUserId = async (pipelineId: string, userId: string) => {
    const [deletedPipeline] = await db.delete(pipelines)
    .where(and(
        eq(pipelines.id, pipelineId),
        eq(pipelines.userId, userId)
    )).returning({
        id: pipelines.id,
        name: pipelines.name
    });
    return deletedPipeline;
}

export const findPipelineByWebhookPath = async (webhookPath: string) => {
    return db.query.pipelines.findFirst({
        where: eq(pipelines.webhookPath, webhookPath)
    });
}