import { AppError } from "../errors/app-error";
import {
  findJobByIdForUser,
  findJobsByPipelineIdForUser,
  findJobsByUserId,
} from "../../../shared/db/repositories/jobs.repository";
import { pipeline } from "node:stream";

export const getJobsService = async (userId: string) =>
  findJobsByUserId(userId);
export const getJobByIdService = async (jobId: string, userId: string) => {
  const job = await findJobByIdForUser(jobId, userId);
  if (!job) throw new AppError("Job not found", "JOB_NOT_FOUND", 404);
  return job;
};
export const getPipelineJobsService = async (
  pipelineId: string,
  userId: string,
) => {
  const jobs = await findJobsByPipelineIdForUser(pipelineId, userId);
  if (!jobs)
    throw new AppError(
      "No jobs found for this pipeline",
      "JOBS_NOT_FOUND",
      404,
    );
  return jobs;
};
