export const MetricKeys = {
    webhooksReceivedTotal: "webhooks_received_total",
    webhooksInvalidSignatureTotal: "webhooks_invalid_signature_total",
    webhookIngestDurationMs: "webhook_ingest_duration_ms",

    httpRequestsTotal: "http_requests_total",
    httpRequestDurationMs: "http_request_duration_ms",
    rateLimitedRequestsTotal: "rate_limited_requests_total",

    jobsClaimedTotal: "jobs_claimed_total",
    jobsCompletedTotal: "jobs_completed_total",
    jobsFailedTotal: "jobs_failed_total",
    jobsFilteredOutTotal: "jobs_filtered_out_total",
    jobProcessingDurationMs: "job_processing_duration_ms",

    deliveriesAttemptedTotal: "deliveries_attempted_total",
    deliveriesSuccessTotal: "deliveries_success_total",
    deliveriesFailedTotal: "deliveries_failed_total",
    deliveriesRetryTotal: "delivery_retry_total",
    deliveryAttemptDurationMs: "delivery_attempt_duration_ms"
} as const;

export type MetricKey = (typeof MetricKeys)[keyof typeof MetricKeys];

export const durationCountKey = (base: string) => `${base}_count`;
export const durationSumKey = (base: string) => `${base}_sum_ms`;
