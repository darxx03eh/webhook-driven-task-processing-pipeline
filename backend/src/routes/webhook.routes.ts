import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { ingestWebhookHandler } from '../controllers/webhook.controller';

const webhookRouter = Router();
webhookRouter.post(
    "/webhooks/:webhookPath",
    asyncHandler(ingestWebhookHandler)
);

export default webhookRouter;