import { NextFunction, Request, Response } from "express";
import { sendErrorResponse } from "../utils/api-response";
import { incrementMetric } from "../../../shared/metrics/runtime-metrics.repository";
import { MetricKeys } from "../../../shared/metrics/metric-keys";
import type { Bucket, RateLimitConfig } from "../types/rate-limit";

const buckets = new Map<string, Bucket>();

const getClientIdentifier = (req: Request) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim() !== "")
    return forwardedFor.split(",")[0].trim();
  if (Array.isArray(forwardedFor) && forwardedFor[0])
    return forwardedFor[0].split(",")[0].trim();
  return req.ip || "unknown";
};

const cleanupExpiredBuckets = (now: number) => {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets)
    if (bucket.resetAt <= now) buckets.delete(key);
};

export const createRateLimitMiddleware = (config: RateLimitConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    cleanupExpiredBuckets(now);
    const clientId = getClientIdentifier(req);
    const key = `${config.scope}:${clientId}`;
    const existing = buckets.get(key);
    const bucket =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + config.windowMs }
        : existing;

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(config.maxRequests - bucket.count, 0);
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", String(config.maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil(bucket.resetAt / 1000)),
    );

    if (bucket.count > config.maxRequests) {
      void incrementMetric(MetricKeys.rateLimitedRequestsTotal, 1);
      res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)));
      return sendErrorResponse(
        res,
        "Too many requests, please retry later.",
        "RATE_LIMITED",
        429,
        {
          scope: config.scope,
          retryAfterSeconds: Math.max(retryAfterSeconds, 1),
        },
      );
    }

    return next();
  };
};
