export type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  scope: string;
};

export type Bucket = {
  count: number;
  resetAt: number;
};
