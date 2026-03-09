import { db } from "../index";
import { jobs } from "../schema";
import { eq } from "drizzle-orm";

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