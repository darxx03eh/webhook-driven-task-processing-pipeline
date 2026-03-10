import { db } from "../index";
import { asc, desc, eq, and } from "drizzle-orm";
import { deliveryAttempts, jobs, pipelines } from "../schema";

type CreateJobInput = {
    pipelineId: string;
    payload: unknown;
};

export const createJob = async (input: CreateJobInput) => {
    const [job] = await db.insert(jobs)
    .values({
        pipelineId: input.pipelineId,
        payload: input.payload,
        status: "pending",
        attempts: 0
    }).returning();
    return job;
}

export const getJobById = async (jobId: string) => {
    return db.query.jobs.findFirst({
        where: eq(jobs.id, jobId)
    });
}

export const findPendingJob = async () => {
    return db.query.jobs.findFirst({
        where: eq(jobs.status, "pending"),
        orderBy: [asc(jobs.createdAt)]
    });
}

export const markJobProcessing = async (jobId: string) => {
    const [job] = await db.update(jobs)
    .set({ status: "processing"}).where(eq(jobs.id, jobId))
    .returning();
    return job;
}

export const markJobCompleted = async (
    jobId: string,
    result: Record<string, unknown>
) => {
    const [job] = await db.update(jobs)
    .set({
        status: "completed",
        result,
        error: null,
        stopReason: null,
        processedAt: new Date()
    }).where(eq(jobs.id, jobId)).returning();
    return job;
}

export const markJobFailed = async (
    jobId: string,
    errorMessage: string
) => {
    const [job] = await db.update(jobs)
    .set({
        status: "failed",
        error: errorMessage,
        processedAt: new Date()
    }).where(eq(jobs.id, jobId)).returning();
    return job;
}

export const markJobFilteredOut = async (
    jobId: string,
    result: Record<string, unknown>,
    stopReason: string
) => {
    const [job] = await db.update(jobs)
    .set({
        status: "filtered_out",
        result,
        stopReason,
        error: null,
        processedAt: new Date()
    }).where(eq(jobs.id, jobId)).returning();
    return job;
}

export const findJobsByUserId  = async (userId: string) => {
    const userPipelines = await db.query.pipelines.findMany({
        where: eq(pipelines.userId, userId),
        columns: {
            id: true
        }
    });
    const pipelineIds = userPipelines.map((pipeline: { id: any; }) => pipeline.id);
    if(pipelineIds.length === 0) return [];
    const allJobs = await Promise.all(
        pipelineIds.map((pipelineId: any) => {
            return db.query.jobs.findMany({
                where: eq(jobs.pipelineId, pipelineId),
                with: {
                    pipeline: true,
                    deliveryAttempts: true
                },
                orderBy: [desc(jobs.createdAt)]
            })
        })
    );
    return allJobs.flat().sort((a, b) => {
        return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    });
}

export const findJobByIdForUser = async (jobId: string, userId: string) => {
    const job = await db.query.jobs.findFirst({
        where: eq(jobs.id, jobId),
        with: {
            pipeline: true,
            deliveryAttempts: true
        }
    });
    if(!job) return null;
    if(job.pipeline.userId !== userId) return null;
    return job;
}

export const findJobsByPipelineIdForUser = async (pipelineId: string, userId: string) => {
    const pipeline = await db.query.pipelines.findFirst({
        where: and(
            eq(pipelines.id, pipelineId),
            eq(pipelines.userId, userId)
        )
    });
    if(!pipeline) return null;
    const pipelineJobs = await db.query.jobs.findMany({
        where: eq(jobs.pipelineId, pipelineId),
        with: {
            deliveryAttempts: true
        },
        orderBy: [desc(jobs.createdAt)]
    });
    return pipelineJobs;
}
