import { Router } from "express";
import authRouter from "./auth.routes";
import pipelineRouter from "./pipeline.routes";
import pipelineStepRouter from "./pipeline-step.routes";
import webhookRouter from "./webhook.routes";

const router = Router();
router.use("/auth", authRouter);
router.use("/pipelines", pipelineRouter);
router.use("/", pipelineStepRouter);
router.use("/", webhookRouter);
router.get("/health", (req, res, next) => {
    res.json({
        status: "ok"
    });
})

export default router;