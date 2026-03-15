import { sql } from "drizzle-orm";
import { db } from "../index";

export type JobsMetricsRow = {
    total_count: number;
    pending_count: number;
    processing_count: number;
    completed_count: number;
    failed_count: number;
    filtered_out_count: number;
};

export type JobDurationRow = {
    count: number;
    sum_ms: number;
};

export type DeliveryMetricsRow = {
    attempted_count: number;
    success_count: number;
    failed_count: number;
    retry_count: number;
};

export const getJobsMetricsByUserId = async (userId: string) => {
    const result = await db.execute(sql<JobsMetricsRow>`
        SELECT
            COUNT(*) AS total_count,
            COUNT(*) FILTER (WHERE j.status = 'pending') AS pending_count,
            COUNT(*) FILTER (WHERE j.status = 'processing') AS processing_count,
            COUNT(*) FILTER (WHERE j.status = 'completed') AS completed_count,
            COUNT(*) FILTER (WHERE j.status = 'failed') AS failed_count,
            COUNT(*) FILTER (WHERE j.status = 'filtered_out') AS filtered_out_count
        FROM jobs j
        JOIN pipelines p ON p.id = j.pipeline_id
        WHERE p.user_id = ${userId}
    `);

    return result.rows[0] ?? {
        total_count: 0,
        pending_count: 0,
        processing_count: 0,
        completed_count: 0,
        failed_count: 0,
        filtered_out_count: 0
    };
};

export const getOldestPendingAgeSecondsByUserId = async (userId: string) => {
    const result = await db.execute(sql<{ oldest_pending_age_seconds: number }>`
        SELECT
            COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(j.created_at))), 0) AS oldest_pending_age_seconds
        FROM jobs j
        JOIN pipelines p ON p.id = j.pipeline_id
        WHERE p.user_id = ${userId}
          AND j.status = 'pending'
    `);

    return result.rows[0]?.oldest_pending_age_seconds ?? 0;
};

export const getJobProcessingDurationByUserId = async (userId: string) => {
    const result = await db.execute(sql<JobDurationRow>`
        SELECT
            COUNT(*) AS count,
            COALESCE(SUM(EXTRACT(EPOCH FROM (j.processed_at - j.created_at)) * 1000), 0) AS sum_ms
        FROM jobs j
        JOIN pipelines p ON p.id = j.pipeline_id
        WHERE p.user_id = ${userId}
          AND j.processed_at IS NOT NULL
          AND j.status IN ('completed', 'failed', 'filtered_out')
    `);

    return result.rows[0] ?? {
        count: 0,
        sum_ms: 0
    };
};

export const getDeliveryMetricsByUserId = async (userId: string) => {
    const result = await db.execute(sql<DeliveryMetricsRow>`
        SELECT
            COUNT(*) AS attempted_count,
            COUNT(*) FILTER (WHERE da.status = 'success') AS success_count,
            COUNT(*) FILTER (WHERE da.status = 'failed') AS failed_count,
            COUNT(*) FILTER (WHERE da.attempt > 1) AS retry_count
        FROM delivery_attempts da
        JOIN jobs j ON j.id = da.job_id
        JOIN pipelines p ON p.id = j.pipeline_id
        WHERE p.user_id = ${userId}
    `);

    return result.rows[0] ?? {
        attempted_count: 0,
        success_count: 0,
        failed_count: 0,
        retry_count: 0
    };
};
