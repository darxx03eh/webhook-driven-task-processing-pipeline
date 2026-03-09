import { Request } from "express";
export interface WebhookRequest extends Request {
    rawBody?: string;
}