import { sql } from "drizzle-orm";
import { db } from "../db";
import { durationCountKey, durationSumKey } from "./metric-keys";

let ensureTablePromise: Promise<void> | null = null;

const ensureMetricsTable = async () => {
    if (!ensureTablePromise) {
        ensureTablePromise = db.execute(sql`
            CREATE TABLE IF NOT EXISTS runtime_metrics (
                metric_key text PRIMARY KEY,
                metric_value double precision NOT NULL DEFAULT 0,
                updated_at timestamp NOT NULL DEFAULT NOW()
            )
        `).then(() => undefined);
    }
    return ensureTablePromise;
};

const safeExec = async (operation: () => Promise<void>) => {
    try {
        await ensureMetricsTable();
        await operation();
    } catch (error) {
        console.error("[metrics] operation failed", error);
    }
};

export const incrementMetric = async (metricKey: string, delta = 1) => {
    if (!Number.isFinite(delta) || delta === 0) return;

    await safeExec(async () => {
        await db.execute(sql`
            INSERT INTO runtime_metrics (metric_key, metric_value, updated_at)
            VALUES (${metricKey}, ${delta}, NOW())
            ON CONFLICT (metric_key)
            DO UPDATE SET
                metric_value = runtime_metrics.metric_value + EXCLUDED.metric_value,
                updated_at = NOW()
        `);
    });
};

export const recordDurationMetric = async (baseMetricKey: string, durationMs: number) => {
    const safeDuration = Math.max(0, Number.isFinite(durationMs) ? durationMs : 0);
    await incrementMetric(durationCountKey(baseMetricKey), 1);
    await incrementMetric(durationSumKey(baseMetricKey), safeDuration);
};

export const getRuntimeMetricsSnapshot = async () => {
    await ensureMetricsTable();
    const result = await db.execute(sql`
        SELECT metric_key, metric_value
        FROM runtime_metrics
    `);

    const rows = result.rows as Array<{ metric_key: unknown; metric_value: unknown }>;
    const snapshot: Record<string, number> = {};

    for (const row of rows) {
        const metricKey = typeof row.metric_key === "string" ? row.metric_key : "";
        if (!metricKey) continue;
        const metricValue = Number(row.metric_value ?? 0);
        snapshot[metricKey] = Number.isFinite(metricValue) ? metricValue : 0;
    }

    return snapshot;
};
