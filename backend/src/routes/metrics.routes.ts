import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { getMetricsSnapshotHandler } from "../controllers/metrics.controller";

const metricsRouter = Router();

metricsRouter.get("/metrics", requireAuth, asyncHandler(getMetricsSnapshotHandler));

export default metricsRouter;
