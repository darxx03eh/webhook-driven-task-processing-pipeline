export type CreateSubscriberInput = {
  pipelineId: string;
  userId: string;
  url: string;
  secret?: string | null;
};
