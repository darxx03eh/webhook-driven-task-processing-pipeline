import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  createSubscriberHandler,
  deleteSubscriberHandler,
  getPipelineSubscribersHandler,
} from "../controllers/subscriber.controller";

const subscriberRouter = Router();
subscriberRouter.post(
  "/pipelines/:id/subscribers",
  requireAuth,
  asyncHandler(createSubscriberHandler),
);
subscriberRouter.get(
  "/pipelines/:id/subscribers",
  requireAuth,
  asyncHandler(getPipelineSubscribersHandler),
);
subscriberRouter.delete(
  "/subscribers/:id",
  requireAuth,
  asyncHandler(deleteSubscriberHandler),
);

export default subscriberRouter;
