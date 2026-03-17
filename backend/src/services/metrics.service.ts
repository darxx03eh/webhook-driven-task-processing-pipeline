import { getRuntimeMetricsSnapshot } from "../../../shared/metrics/runtime-metrics.repository";
import {
  MetricKeys,
  durationCountKey,
  durationSumKey,
} from "../../../shared/metrics/metric-keys";
import {
  getDeliveryMetricsByUserId,
  getJobProcessingDurationByUserId,
  getJobsMetricsByUserId,
  getOldestPendingAgeSecondsByUserId,
} from "../../../shared/db/repositories/metrics.repository";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

const readDuration = (snapshot: Record<string, number>, metricKey: string) => {
  const count = toNumber(snapshot[durationCountKey(metricKey)]);
  const sumMs = toNumber(snapshot[durationSumKey(metricKey)]);
  const avgMs = count > 0 ? sumMs / count : 0;
  return { count, sumMs, avgMs };
};

export const getMetricsSnapshotService = async (userId: string) => {
  const runtimeSnapshot = await getRuntimeMetricsSnapshot();

  const [jobs, oldestPendingAgeSecondsRaw, jobDuration, delivery] =
    await Promise.all([
      getJobsMetricsByUserId(userId),
      getOldestPendingAgeSecondsByUserId(userId),
      getJobProcessingDurationByUserId(userId),
      getDeliveryMetricsByUserId(userId),
    ]);

  const oldestPendingAgeSeconds = toNumber(oldestPendingAgeSecondsRaw);
  const jobDurationCount = toNumber(jobDuration.count);
  const jobDurationSumMs = toNumber(jobDuration.sum_ms);

  return {
    generatedAt: new Date().toISOString(),
    scope: "user",
    counters: {
      webhooks_received_total: toNumber(jobs.total_count),
      webhooks_invalid_signature_total: toNumber(
        runtimeSnapshot[MetricKeys.webhooksInvalidSignatureTotal],
      ),
      http_requests_total: toNumber(
        runtimeSnapshot[MetricKeys.httpRequestsTotal],
      ),
      rate_limited_requests_total: toNumber(
        runtimeSnapshot[MetricKeys.rateLimitedRequestsTotal],
      ),

      jobs_claimed_total:
        toNumber(jobs.processing_count) +
        toNumber(jobs.completed_count) +
        toNumber(jobs.failed_count) +
        toNumber(jobs.filtered_out_count),
      jobs_completed_total: toNumber(jobs.completed_count),
      jobs_failed_total: toNumber(jobs.failed_count),
      jobs_filtered_out_total: toNumber(jobs.filtered_out_count),

      deliveries_attempted_total: toNumber(delivery.attempted_count),
      deliveries_success_total: toNumber(delivery.success_count),
      deliveries_failed_total: toNumber(delivery.failed_count),
      delivery_retry_total: toNumber(delivery.retry_count),
    },
    durations: {
      webhook_ingest_duration_ms: readDuration(
        runtimeSnapshot,
        MetricKeys.webhookIngestDurationMs,
      ),
      http_request_duration_ms: readDuration(
        runtimeSnapshot,
        MetricKeys.httpRequestDurationMs,
      ),
      job_processing_duration_ms: {
        count: jobDurationCount,
        sumMs: jobDurationSumMs,
        avgMs: jobDurationCount > 0 ? jobDurationSumMs / jobDurationCount : 0,
      },
      delivery_attempt_duration_ms: readDuration(
        runtimeSnapshot,
        MetricKeys.deliveryAttemptDurationMs,
      ),
    },
    gauges: {
      jobs_pending_gauge: toNumber(jobs.pending_count),
      jobs_processing_gauge: toNumber(jobs.processing_count),
      oldest_pending_job_age_seconds: oldestPendingAgeSeconds,
    },
  };
};
