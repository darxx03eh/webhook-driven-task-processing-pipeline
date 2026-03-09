import { eq } from 'drizzle-orm';
import { db } from '../index'
import { pipelines } from '../schema';

export const findPipelineByWebhookPath = async (webhookPath: string) => {
    return db.query.pipelines.findFirst({
        where: eq(pipelines.webhookPath, webhookPath)
    });
}