import { apiClient } from "./client";

export type DurationMetric = {
    count: number;
    sumMs: number;
    avgMs: number;
};

export type MetricsSnapshot = {
    generatedAt: string;
    scope: "user" | "global";
    counters: {
        webhooks_received_total: number;
        webhooks_invalid_signature_total: number;
        http_requests_total: number;
        rate_limited_requests_total: number;

        jobs_claimed_total: number;
        jobs_completed_total: number;
        jobs_failed_total: number;
        jobs_filtered_out_total: number;

        deliveries_attempted_total: number;
        deliveries_success_total: number;
        deliveries_failed_total: number;
        delivery_retry_total: number;
    };
    durations: {
        webhook_ingest_duration_ms: DurationMetric;
        http_request_duration_ms: DurationMetric;
        job_processing_duration_ms: DurationMetric;
        delivery_attempt_duration_ms: DurationMetric;
    };
    gauges: {
        jobs_pending_gauge: number;
        jobs_processing_gauge: number;
        oldest_pending_job_age_seconds: number;
    };
};

export const getMetricsSnapshotRequest = async (): Promise<MetricsSnapshot> => {
    const response = await apiClient.get("/metrics");
    return response.data.data.metrics as MetricsSnapshot;
};
