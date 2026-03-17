import { Response } from "express";
import { AppError } from "../errors/app-error";
import { sendSuccessResponse } from "../utils/api-response";
import { AuthRequest } from "../types/auth-request";
import {
  createPipelineStepService,
  deletePipelineStepService,
  getPipelineStepsService,
  updatePipelineStepService,
} from "../services/pipeline-step.service";

export const createPipelineStepHandler = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  const { stepOrder, stepType, stepConfig } = req.body;
  const step = await createPipelineStepService({
    pipelineId: req.params.id as string,
    userId: req.user.id,
    stepOrder,
    stepType,
    stepConfig,
  });
  return sendSuccessResponse(
    res,
    "Pipeline step created successfully",
    { step },
    201,
  );
};

export const getPipelineStepsHandler = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  const steps = await getPipelineStepsService(
    req.params.id as string,
    req.user.id,
  );
  return sendSuccessResponse(
    res,
    "Pipeline steps retrieved successfully",
    { steps },
    200,
  );
};

export const updatePipelineStepHandler = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  const { stepOrder, stepType, stepConfig } = req.body;
  const step = await updatePipelineStepService({
    stepId: req.params.stepId as string,
    userId: req.user.id,
    stepOrder,
    stepType,
    stepConfig,
  });
  return sendSuccessResponse(
    res,
    "Pipeline step updated successfully",
    { step },
    200,
  );
};

export const deletePipelineStepHandler = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  const step = await deletePipelineStepService(
    req.params.stepId as string,
    req.user.id,
  );
  return sendSuccessResponse(
    res,
    "Pipeline step deleted successfully",
    { step },
    200,
  );
};
