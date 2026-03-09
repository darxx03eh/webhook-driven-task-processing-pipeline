import { db } from "../index";
import { jobs } from "../schema";
import { asc, eq } from "drizzle-orm";

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