import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
  createPipelineStepHandler,
  deletePipelineStepHandler,
  getPipelineStepsHandler,
  updatePipelineStepHandler,
} from "../controllers/pipeline-step.controller";

const pipelineStepRouter = Router();
pipelineStepRouter.post(
  "/pipelines/:id/steps",
  requireAuth,
  asyncHandler(createPipelineStepHandler),
);
pipelineStepRouter.get(
  "/pipelines/:id/steps",
  requireAuth,
  asyncHandler(getPipelineStepsHandler),
);
pipelineStepRouter.put(
  "/pipeline-steps/:stepId",
  requireAuth,
  asyncHandler(updatePipelineStepHandler),
);
pipelineStepRouter.delete(
  "/pipeline-steps/:stepId",
  requireAuth,
  asyncHandler(deletePipelineStepHandler),
);

export default pipelineStepRouter;
