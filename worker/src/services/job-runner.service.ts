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
import type { PipelineStep } from "../types/pipeline-step.types";

const readStepsSnapshot = (value: unknown): PipelineStep[] => {
  if (!Array.isArray(value)) return [];

  const parsedSteps: PipelineStep[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const step = item as Record<string, unknown>;
    if (
      typeof step.id !== "string" ||
      typeof step.stepType !== "string" ||
      typeof step.stepOrder !== "number"
    ) {
      continue;
    }
    parsedSteps.push({
      id: step.id,
      stepType: step.stepType,
      stepOrder: step.stepOrder,
      stepConfig: step.stepConfig ?? {},
    });
  }

  return parsedSteps.sort((a, b) => a.stepOrder - b.stepOrder);
};

export const runNextPendingJob = async () => {
  const pendingJob = await claimNextPendingJob();
  if (!pendingJob) return;

  await incrementMetric(MetricKeys.jobsClaimedTotal, 1);
  const startedAt = Date.now();
  console.log(`[worker] Claimed pending job with id ${pendingJob.id}`);

  try {
    const snapshotSteps = readStepsSnapshot(pendingJob.stepsSnapshot);
    const steps =
      snapshotSteps.length > 0
        ? snapshotSteps
        : await findPipelineStepsByPipelineId(pendingJob.pipelineId);
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
