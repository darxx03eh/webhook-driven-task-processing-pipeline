import {
    findPendingJob, markJobCompleted,
    markJobFailed, markJobFilteredOut,
    markJobProcessing, claimNextPendingJob
} from "../../../shared/db/repositories/jobs.repository";
import { findPipelineStepsByPipelineId } from "../../../shared/db/repositories/pipelines-step.repository";
import { executePipelineSteps } from "./step-executor.service";
import { deliverResultToSubscribers } from "./subscriber-delivery.service";

export const runNextPendingJob = async () => {
    // const pendingJob = await findPendingJob();
    // if (!pendingJob) return;
    // console.log(`[worker] Found pending job with id ${pendingJob.id}`);
    // await markJobProcessing(pendingJob.id);
    const pendingJob = await claimNextPendingJob();
    if (!pendingJob) return;
    console.log(`[worker] Claimed pending job with id ${pendingJob.id}`);
    try {
        const steps = await findPipelineStepsByPipelineId(pendingJob.pipelineId);
        const payload =
            pendingJob.payload && typeof pendingJob.payload === "object"
                ? (pendingJob.payload as Record<string, unknown>)
                : {};
        const result = await executePipelineSteps(payload, steps);
        if (result.stopped) {
            await markJobFilteredOut(
                pendingJob.id,
                result.payload,
                result.stopReason
            );
            console.log(`[worker] Job filtered out with id ${pendingJob.id}, reason: ${result.stopReason}`);
            return;
        }
        await markJobCompleted(pendingJob.id, result.payload);
        await deliverResultToSubscribers({
            jobId: pendingJob.id,
            pipelineId: pendingJob.pipelineId,
            result: result.payload
        });
        console.log(`[worker] Job completed with id ${pendingJob.id}`);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown worker error";
        await markJobFailed(pendingJob.id, message);
        console.error(`[worker] Job failed with id ${pendingJob.id}: ${message}`, err);
    }
}