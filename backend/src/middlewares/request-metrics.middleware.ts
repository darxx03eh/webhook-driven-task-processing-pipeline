import { NextFunction, Request, Response } from "express";
import {
  incrementMetric,
  recordDurationMetric,
} from "../../../shared/metrics/runtime-metrics.repository";
import { MetricKeys } from "../../../shared/metrics/metric-keys";

const normalizeRoute = (rawPath: string) => {
  const noQuery = rawPath.split("?")[0];
  return noQuery
    .replace(/\/api\/webhooks\/[^/]+/g, "/api/webhooks/:webhookPath")
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}/g, ":id");
};

export const requestMetricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const normalizedRoute = normalizeRoute(
      req.originalUrl || req.url || "unknown",
    );
    const statusFamily = `${Math.floor(res.statusCode / 100)}xx`;

    void incrementMetric(MetricKeys.httpRequestsTotal, 1);
    void incrementMetric(
      `http_requests_total|${req.method}|${normalizedRoute}|${statusFamily}`,
      1,
    );
    void recordDurationMetric(MetricKeys.httpRequestDurationMs, durationMs);
  });

  return next();
};
