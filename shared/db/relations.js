"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliveryAttemptsRelations = exports.jobsRelations = exports.subscribersRelations = exports.pipelinesStepsRelations = exports.pipelinesRelations = exports.usersRelations = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("./schema");
exports.usersRelations = (0, drizzle_orm_1.relations)(schema_1.users, ({ many }) => ({
    pipelines: many(schema_1.pipelines),
}));
exports.pipelinesRelations = (0, drizzle_orm_1.relations)(schema_1.pipelines, ({ one, many }) => ({
    user: one(schema_1.users, {
        fields: [schema_1.pipelines.userId],
        references: [schema_1.users.id],
    }),
    steps: many(schema_1.pipelinesSteps),
    subscribers: many(schema_1.subscribers),
    jobs: many(schema_1.jobs),
}));
exports.pipelinesStepsRelations = (0, drizzle_orm_1.relations)(schema_1.pipelinesSteps, ({ one }) => ({
    pipeline: one(schema_1.pipelines, {
        fields: [schema_1.pipelinesSteps.pipelineId],
        references: [schema_1.pipelines.id],
    }),
}));
exports.subscribersRelations = (0, drizzle_orm_1.relations)(schema_1.subscribers, ({ one, many }) => ({
    pipeline: one(schema_1.pipelines, {
        fields: [schema_1.subscribers.pipelineId],
        references: [schema_1.pipelines.id],
    }),
    deliveryAttempts: many(schema_1.deliveryAttempts),
}));
exports.jobsRelations = (0, drizzle_orm_1.relations)(schema_1.jobs, ({ one, many }) => ({
    pipeline: one(schema_1.pipelines, {
        fields: [schema_1.jobs.pipelineId],
        references: [schema_1.pipelines.id],
    }),
    deliveryAttempts: many(schema_1.deliveryAttempts),
}));
exports.deliveryAttemptsRelations = (0, drizzle_orm_1.relations)(schema_1.deliveryAttempts, ({ one }) => ({
    job: one(schema_1.jobs, {
        fields: [schema_1.deliveryAttempts.jobId],
        references: [schema_1.jobs.id],
    }),
    subscriber: one(schema_1.subscribers, {
        fields: [schema_1.deliveryAttempts.subscriberId],
        references: [schema_1.subscribers.id],
    }),
}));
