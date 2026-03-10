import { Router } from "express";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../middleware/auth.middleware";
import {
    getJobByIdHandler,
    getJobsHandler,
    getPipelineJobsHandler,
} from "../controllers/job.controller";

const jobRouter = Router();
jobRouter.get("/jobs", requireAuth, asyncHandler(getJobsHandler));
jobRouter.get("/jobs/:id", requireAuth, asyncHandler(getJobByIdHandler));
jobRouter.get("/pipelines/:id/jobs", requireAuth, asyncHandler(getPipelineJobsHandler));

export default jobRouter;
