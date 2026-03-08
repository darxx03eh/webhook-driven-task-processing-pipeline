import crypto from 'crypto';
import { AppError } from '../errors/app-error';
import {
    createPipeline,
    deletePipelineByIdAndUserId,
    findPipelineByIdAndUserId,
    findPipelinesByUserId
} from '../db/repositories/pipelines.repository';
import { pipeline } from 'stream';

type CreatePipelineInput = {
    userId: string;
    name: string;
};

const generateWebhookSecret = () => crypto.randomBytes(32).toString('hex');
const generateWebhookPath = () => crypto.randomBytes(12).toString('hex');

export const createPipelineService = async (input: CreatePipelineInput) => {
    const trimmedName = input.name.trim();
    if(!trimmedName)
        throw new AppError("pipeline name is required", "VALIDATION_ERROR", 400);
    const pipeline = await createPipeline({
        userId: input.userId,
        name: trimmedName,
        webhookPath: generateWebhookPath(),
        webhookSecret: generateWebhookSecret()
    });
    return pipeline;
}

export const getUserPipelinesyService = async (userId: string) => {
    return await findPipelinesByUserId(userId);
}

export const getPipelineByIdService = async (pipelineId: string, userId: string) => {
    const pipeline = await findPipelineByIdAndUserId(pipelineId, userId);
    if(!pipeline)
        throw new AppError("Pipeline not found", "PIPELINE_NOT_FOUND", 404);
    return pipeline;
}

export const deletePipelineService = async (pipelineId: string, userId: string) => {
    const deletedPipeline = await deletePipelineByIdAndUserId(pipelineId, userId);
    if(!deletedPipeline)
        throw new AppError("Pipeline not found", "PIPELINE_NOT_FOUND", 404);
    return deletedPipeline;
}
