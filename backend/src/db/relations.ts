import { relations } from "drizzle-orm";
import {
    users,
    pipelines,
    pipelinesSteps,
    subscribers,
    jobs,
    deliveryAttempts,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
    pipelines: many(pipelines),
}));

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
    user: one(users, {
        fields: [pipelines.userId],
        references: [users.id],
    }),
    steps: many(pipelinesSteps),
    subscribers: many(subscribers),
    jobs: many(jobs),
}));

export const pipelinesStepsRelations = relations(pipelinesSteps, ({ one }) => ({
    pipeline: one(pipelines, {
        fields: [pipelinesSteps.pipelineId],
        references: [pipelines.id],
    }),
}));

export const subscribersRelations = relations(subscribers, ({ one, many }) => ({
    pipeline: one(pipelines, {
        fields: [subscribers.pipelineId],
        references: [pipelines.id],
    }),
    deliveryAttempts: many(deliveryAttempts),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
    pipeline: one(pipelines, {
        fields: [jobs.pipelineId],
        references: [pipelines.id],
    }),
    deliveryAttempts: many(deliveryAttempts),
}));

export const deliveryAttemptsRelations = relations(
    deliveryAttempts,
    ({ one }) => ({
        job: one(jobs, {
            fields: [deliveryAttempts.jobId],
            references: [jobs.id],
        }),
        subscriber: one(subscribers, {
            fields: [deliveryAttempts.subscriberId],
            references: [subscribers.id],
        }),
    })
);