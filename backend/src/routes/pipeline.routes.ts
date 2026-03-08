import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
    createPipelineHandler,
    deletePipelineHandler,
    getPipelineByIdHandler,
    getPipelinesHandler
} from "../controllers/pipeline.controller";

const pipelineRouter = Router();
pipelineRouter.post("/", requireAuth, asyncHandler(createPipelineHandler));
pipelineRouter.get("/", requireAuth, asyncHandler(getPipelinesHandler));
pipelineRouter.get("/:id", requireAuth, asyncHandler(getPipelineByIdHandler));
pipelineRouter.delete("/:id", requireAuth, asyncHandler(deletePipelineHandler));

export default pipelineRouter;