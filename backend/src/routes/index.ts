import { Router } from "express";
import authRouter from "./auth.routes";
import pipelineRouter from "./pipeline.routes";
import pipelineStepRouter from "./pipeline-step.routes";

const router = Router();
router.use("/auth", authRouter);
router.use("/pipelines", pipelineRouter);
router.use("/", pipelineStepRouter);
router.get("/health", (req, res, next) => {
    res.json({
        status: "ok"
    });
})

export default router;