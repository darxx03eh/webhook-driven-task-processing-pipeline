export type DeliveryResultInput = {
  jobId: string;
  pipelineId: string;
  result: Record<string, unknown>;
};

export type DeliverySubscriber = {
  id: string;
  url: string;
  secret?: string | null;
};
