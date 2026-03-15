import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { ingestWebhookHandler } from '../controllers/webhook.controller';
import { createRateLimitMiddleware } from '../middleware/rate-limit.middleware';
import { config } from '../config/env';

const webhookRouter = Router();
const webhookRateLimit = createRateLimitMiddleware({
    scope: "webhook",
    windowMs: config.rateLimit.webhookWindowMs,
    maxRequests: config.rateLimit.webhookMaxRequests
});

webhookRouter.post(
    "/webhooks/:webhookPath",
    webhookRateLimit,
    asyncHandler(ingestWebhookHandler)
);

export default webhookRouter;
