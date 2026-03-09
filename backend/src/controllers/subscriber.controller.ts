import { Response } from 'express';
import { AppError } from '../errors/app-error';
import { sendSuccessResponse } from '../utils/api-response';
import { AuthRequest } from '../types/auth-request';
import {
    createSubscriberService,
    deleteSubscriberService,
    getPipelineSubscribersService,
} from '../services/subscriber.service';

export const createSubscriberHandler = async (req: AuthRequest, res: Response) => {
    if (!req.user) 
        throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    const { url, secret } = req.body;
    const subscriber = await createSubscriberService({
        pipelineId: req.params.id as string,
        userId: req.user.id,
        url,
        secret
    });
    return sendSuccessResponse(
        res,
        "Subscriber created successfully",
        { subscriber }, 201
    );
}

export const getPipelineSubscribersHandler = async (req: AuthRequest, res: Response) => {
    if(!req.user)
        throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    const subscribers = await getPipelineSubscribersService(
        req.params.id as string,
        req.user.id
    );
    return sendSuccessResponse(
        res,
        "Subscribers retrieved successfully",
        { subscribers }, 200
    );
}

export const deleteSubscriberHandler = async (req: AuthRequest, res: Response) => {
    if(!req.user)
        throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    const subscriber = await deleteSubscriberService(
        req.params.id as string,
        req.user.id
    );
    return sendSuccessResponse(
        res,
        "Subscriber deleted successfully",
        { subscriber }, 200
    );
}