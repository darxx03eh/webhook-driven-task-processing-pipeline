import {
  markJobCompleted,
  markJobFailed,
  markJobFilteredOut,
  claimNextPendingJob,
} from "../../../shared/db/repositories/jobs.repository";
import { findPipelineStepsByPipelineId } from "../../../shared/db/repositories/pipelines-step.repository";
import { executePipelineSteps } from "./step-executor.service";
import { deliverResultToSubscribers } from "./subscriber-delivery.service";
import {
  incrementMetric,
  recordDurationMetric,
} from "../../../shared/metrics/runtime-metrics.repository";
import { MetricKeys } from "../../../shared/metrics/metric-keys";

export const runNextPendingJob = async () => {
  const pendingJob = await claimNextPendingJob();
  if (!pendingJob) return;

  await incrementMetric(MetricKeys.jobsClaimedTotal, 1);
  const startedAt = Date.now();
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
        result.stopReason,
      );
      await incrementMetric(MetricKeys.jobsFilteredOutTotal, 1);
      console.log(
        `[worker] Job filtered out with id ${pendingJob.id}, reason: ${result.stopReason}`,
      );
      return;
    }

    await markJobCompleted(pendingJob.id, result.payload);
    await incrementMetric(MetricKeys.jobsCompletedTotal, 1);

    await deliverResultToSubscribers({
      jobId: pendingJob.id,
      pipelineId: pendingJob.pipelineId,
      result: result.payload,
    });
    console.log(`[worker] Job completed with id ${pendingJob.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown worker error";
    await markJobFailed(pendingJob.id, message);
    await incrementMetric(MetricKeys.jobsFailedTotal, 1);
    console.error(
      `[worker] Job failed with id ${pendingJob.id}: ${message}`,
      err,
    );
  } finally {
    await recordDurationMetric(
      MetricKeys.jobProcessingDurationMs,
      Date.now() - startedAt,
    );
  }
};
