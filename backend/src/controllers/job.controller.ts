import { Response } from "express";
import { AppError } from "../errors/app-error";
import { sendSuccessResponse } from "../utils/api-response";
import { AuthRequest } from "../types/auth-request";
import {
    getJobByIdService,
    getJobsService,
    getPipelineJobsService,
} from "../services/job.service";

export const getJobsHandler = async (req: AuthRequest, res: Response) => {
    if(!req.user)
        throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    const jobs = await getJobsService(req.user.id);
    return sendSuccessResponse(
        res, "Jobs retrieved successfully",
        { jobs }, 200
    );
}

export const getJobByIdHandler = async (req: AuthRequest, res: Response) => {
    if(!req.user)
        throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    const job = await getJobByIdService(req.params.id as string, req.user.id);
    return sendSuccessResponse(
        res, "Job retrieved successfully",
        { job }, 200
    );
}

export const getPipelineJobsHandler = async (req: AuthRequest, res: Response) => {
    if(!req.user)
        throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    const jobs = await getPipelineJobsService(req.params.id as string, req.user.id);
    return sendSuccessResponse(
        res, "Pipeline jobs retrieved successfully",
        { jobs }, 200
    );
}
