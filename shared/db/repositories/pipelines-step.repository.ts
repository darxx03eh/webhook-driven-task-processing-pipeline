import { and, asc, eq} from "drizzle-orm";
import { db } from "../index";
import { pipelinesSteps, pipelines } from "../schema";

type CreatePipelineStepInput = {
    pipelineId: string;
    stepOrder: number;
    stepType: string;
    stepConfig: unknown;
};

type UpdatePipelineStepInput = {
    stepOrder: number;
    stepType: string;
    stepConfig: unknown;
};

export const findPipelineOwnedByUser = async (pipelineId: string, userId: string) => {
    return db.query.pipelines.findFirst({
        where: and(
            eq(pipelines.id, pipelineId),
            eq(pipelines.userId, userId)
        )
    });
}

export const createPipelineStep = async (input: CreatePipelineStepInput) => {
    const [step] = await db.insert(pipelinesSteps)
    .values({
        pipelineId: input.pipelineId,
        stepOrder: input.stepOrder,
        stepType: input.stepType,
        stepConfig: input.stepConfig
    }).returning();
    return step;
}

export const findPipelineStepsByPipelineId = async (pipelineId: string) => {
    return db.query.pipelinesSteps.findMany({
        where: eq(pipelinesSteps.pipelineId, pipelineId),
        orderBy: [asc(pipelinesSteps.stepOrder)]
    });
}

export const findStepById = async (stepId: string) => {
    return db.query.pipelinesSteps.findFirst({
        where: eq(pipelinesSteps.id, stepId)
    });
}

export const findStepByIdWithPipeline = async (stepId: string) => {
    return db.query.pipelinesSteps.findFirst({
        where: eq(pipelinesSteps.id, stepId),
        with: {
            pipeline: true
        }
    });
}

export const updatePipelineStepById = async (
    stepId: string,
    input: UpdatePipelineStepInput
) => {
    const [updatedStep] = await db.update(pipelinesSteps)
    .set({
        stepOrder: input.stepOrder,
        stepType: input.stepType,
        stepConfig: input.stepConfig
    }).where(eq(pipelinesSteps.id, stepId)).returning();
    return updatedStep;
}

export const deletePipelineStepById = async (stepId: string) => {
    const [deletedStep] = await db.delete(pipelinesSteps)
    .where(eq(pipelinesSteps.id, stepId)).returning();
    return deletedStep;
}