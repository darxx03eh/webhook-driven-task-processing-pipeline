import { relations } from "drizzle-orm";
import {
    users, pipelines, subscribers,
    jobs, deliveryAttempts
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
    pipelines: many(pipelines)
}));

export const pipelinesRelations = relations(pipelines, ({one, many}) => ({
    user: one(users, {
        fields: [pipelines.userId],
        references: [users.id]
    }),
    subscribers: many(subscribers),
    jobs: many(jobs)
}));

export const subscribersRelations = relations(subscribers, ({ one, many }) => ({
    pipeline: one(pipelines, {
        fields: [subscribers.pipelineId],
        references: [pipelines.id]
    }),
    deliveryAttempts: many(deliveryAttempts)
}));

const jobsRelations = relations(jobs, ({ one, many }) => ({
    pipeline: one(pipelines, {
        fields: [jobs.pipelineId],
        references: [pipelines.id]
    }),
    deliveryAttempts: many(deliveryAttempts)
}));

const deliveryAttemptsRelations = relations(deliveryAttempts, ({ one}) => ({
    job: one(jobs, {
        fields: [deliveryAttempts.jobId],
        references: [jobs.id]
    }),
    subscribers: one(subscribers, {
        fields: [deliveryAttempts.subscriberId],
        references: [subscribers.id]
    })
}));