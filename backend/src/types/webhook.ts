export type IngestWebhookInput = {
  webhookPath: string;
  rawBody: string;
  payload: unknown;
  signature?: string;
};
