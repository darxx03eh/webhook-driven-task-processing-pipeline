import { Router } from "express";
import authRouter from "./auth.routes";
import pipelineRouter from "./pipeline.routes";
import pipelineStepRouter from "./pipeline-step.routes";
import webhookRouter from "./webhook.routes";
import subscriberRouter from "./subscriber.routes";
import jobRouter from "./job.routes";
import metricsRouter from "./metrics.routes";

const router = Router();
router.use("/auth", authRouter);
router.use("/pipelines", pipelineRouter);
router.use("/", pipelineStepRouter);
router.use("/", subscriberRouter);
router.use("/", webhookRouter);
router.use("/", jobRouter);
router.use("/", metricsRouter);
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

export default router;
