import { Router } from "express";
import authRouter from "./auth.routes";
import pipelineRouter from "./pipeline.routes";

const router = Router();
router.use("/auth", authRouter);
router.use("/pipelines", pipelineRouter);
router.get("/health", (req, res, next) => {
    res.json({
        status: "ok"
    });
})

export default router;