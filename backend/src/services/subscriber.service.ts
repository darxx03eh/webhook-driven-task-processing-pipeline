import { AppError } from "../errors/app-error";
import {
  createSubscriber,
  deleteSubscriberById,
  findPipelineOwnedByUserForSubscribers,
  findSubscriberByIdWithPipeline,
  findSubscribersByPipelineId,
} from "../../../shared/db/repositories/subscribers.repository";

type CreateSubscriberInput = {
  pipelineId: string;
  userId: string;
  url: string;
  secret?: string | null;
};

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const createSubscriberService = async (input: CreateSubscriberInput) => {
  const pipeline = await findPipelineOwnedByUserForSubscribers(
    input.pipelineId,
    input.userId,
  );
  if (!pipeline)
    throw new AppError("Pipeline not found", "PIPELINE_NOT_FOUND", 404);
  const trimmedUrl = input.url.trim();
  if (!trimmedUrl)
    throw new AppError("Subscriber URL is required", "VALIDATION_ERROR", 400);
  if (!isValidHttpUrl(trimmedUrl))
    throw new AppError("Invalid subscriber URL", "INVALID_SUBSCRIBER_URL", 400);
  const subscriber = await createSubscriber({
    pipelineId: input.pipelineId,
    url: trimmedUrl,
    secret: input.secret ?? null,
  });
  return subscriber;
};

export const getPipelineSubscribersService = async (
  pipelineId: string,
  userId: string,
) => {
  const pipeline = await findPipelineOwnedByUserForSubscribers(
    pipelineId,
    userId,
  );
  if (!pipeline)
    throw new AppError("Pipeline not found", "PIPELINE_NOT_FOUND", 404);
  return findSubscribersByPipelineId(pipelineId);
};

export const deleteSubscriberService = async (
  subscriberId: string,
  userId: string,
) => {
  const subscriber = await findSubscriberByIdWithPipeline(subscriberId);
  if (!subscriber)
    throw new AppError("Subscriber not found", "SUBSCRIBER_NOT_FOUND", 404);
  if (subscriber.pipeline.userId !== userId)
    throw new AppError("Forbidden", "FORBIDDEN", 403);
  return deleteSubscriberById(subscriberId);
};
