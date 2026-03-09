import { AppError } from "../errors/app-error";
import {
    createPipelineStep,
    deletePipelineStepById,
    findPipelineOwnedByUser,
    findPipelineStepsByPipelineId,
    findStepByIdWithPipeline,
    updatePipelineStepById,
} from "../../../shared/db/repositories/pipelines-step.repository";

type CreatePipelineStepInput = {
    pipelineId: string;
    userId: string;
    stepOrder: number;
    stepType: string;
    stepConfig: unknown;
};

type UpdatePipelineStepInput = {
    stepId: string;
    userId: string;
    stepOrder: number;
    stepType: string;
    stepConfig: unknown;
};

const ALLOWED_STEP_TYPES = ["filter", "transform", "enrich_http"];

const validateStepType = (stepType: string) => {
    if (!ALLOWED_STEP_TYPES.includes(stepType))
        throw new AppError("Invalid step type", "INVALID_STEP_TYPE", 400, {
            allowedTypes: ALLOWED_STEP_TYPES,
        });
}
const validateStepOrder = (stepOrder: number) => {
    if (!Number.isInteger(stepOrder) || stepOrder < 1)
        throw new AppError("stepOrder must be a positive integer", "VALIDATION_ERROR", 400);
}

export const createPipelineStepService = async (input: CreatePipelineStepInput) => {
    const pipeline = await findPipelineOwnedByUser(input.pipelineId, input.userId);
    if(!pipeline)
        throw new AppError("Pipeline not found", "PIPELINE_NOT_FOUND", 404);
    validateStepOrder(input.stepOrder);
    validateStepType(input.stepType);
    const step = await createPipelineStep({
        pipelineId: input.pipelineId,
        stepOrder: input.stepOrder,
        stepType: input.stepType,
        stepConfig: input.stepConfig,
    });
    return step;
}

export const getPipelineStepsService = async (pipelineId: string, userId: string) => {
    const pipeline = await findPipelineOwnedByUser(pipelineId, userId);
    if(!pipeline)
        throw new AppError("Pipeline not found", "PIPELINE_NOT_FOUND", 404);
    return findPipelineStepsByPipelineId(pipelineId);
}

export const updatePipelineStepService = async (input: UpdatePipelineStepInput) => {
    const step = await findStepByIdWithPipeline(input.stepId);
    if(!step)
        throw new AppError("Pipeline step not found", "PIPELINE_STEP_NOT_FOUND", 404);
    if(step.pipeline.userId !== input.userId)
        throw new AppError("Forbidden", "FORBIDDEN", 403);
    validateStepOrder(input.stepOrder);
    validateStepType(input.stepType);
    const updatedStep = await updatePipelineStepById(input.stepId, {
        stepOrder: input.stepOrder,
        stepType: input.stepType,
        stepConfig: input.stepConfig ?? null
    });
    return updatedStep;
}

export const deletePipelineStepService = async (stepId: string, userId: string) => {
    const step = await findStepByIdWithPipeline(stepId);
    if(!step)
        throw new AppError("Pipeline step not found", "PIPELINE_STEP_NOT_FOUND", 404);
    if(step.pipeline.userId !== userId)
        throw new AppError("Forbidden", "FORBIDDEN", 403);
    return deletePipelineStepById(stepId);  
}





