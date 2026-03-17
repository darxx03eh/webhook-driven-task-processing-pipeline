import { Response } from "express";
import { AppError } from "../errors/app-error";
import { sendSuccessResponse } from "../utils/api-response";
import { AuthRequest } from "../types/auth-request";
import {
  createPipelineService,
  deletePipelineService,
  getPipelineByIdService,
  getUserPipelinesyService,
} from "../services/pipeline.service";

export const createPipelineHandler = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  const { name } = req.body;
  if (!name)
    throw new AppError("Pipeline name is required", "VALIDATION_ERROR", 400);
  const pipeline = await createPipelineService({
    userId: req.user.id,
    name,
  });
  return sendSuccessResponse(
    res,
    "Pipeline created successfully",
    { pipeline },
    201,
  );
};

export const getPipelinesHandler = async (req: AuthRequest, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  const pipelines = await getUserPipelinesyService(req.user.id);
  return sendSuccessResponse(
    res,
    "Pipelines retrieved successfully",
    { pipelines },
    200,
  );
};

export const getPipelineByIdHandler = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  const pipeline = await getPipelineByIdService(
    req.params.id as string,
    req.user.id,
  );
  return sendSuccessResponse(
    res,
    "Pipeline retrieved successfully",
    { pipeline },
    200,
  );
};

export const deletePipelineHandler = async (
  req: AuthRequest,
  res: Response,
) => {
  if (!req.user) throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
  const deletedPipeline = await deletePipelineService(
    req.params.id as string,
    req.user.id,
  );
  return sendSuccessResponse(
    res,
    "Pipeline deleted successfully",
    { pipeline: deletedPipeline },
    200,
  );
};
