"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelinesSteps = exports.deliveryAttempts = exports.jobs = exports.subscribers = exports.pipelines = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow()
});
exports.pipelines = (0, pg_core_1.pgTable)("pipelines", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id").notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    webhookSecret: (0, pg_core_1.text)("webhook_secret").notNull(),
    webhookPath: (0, pg_core_1.text)("webhook_path").notNull().unique(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow()
});
exports.subscribers = (0, pg_core_1.pgTable)("subscribers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull()
        .references(() => exports.pipelines.id, { onDelete: "cascade" }),
    url: (0, pg_core_1.text)("url").notNull(),
    secret: (0, pg_core_1.text)("secret"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow()
});
exports.jobs = (0, pg_core_1.pgTable)("jobs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull()
        .references(() => exports.pipelines.id, { onDelete: "cascade" }),
    payload: (0, pg_core_1.jsonb)("payload").notNull(),
    status: (0, pg_core_1.text)("status").notNull(),
    attempts: (0, pg_core_1.integer)("attempts").notNull().default(0),
    result: (0, pg_core_1.jsonb)("result"),
    error: (0, pg_core_1.text)("error"),
    stopReason: (0, pg_core_1.text)("stop_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    processedAt: (0, pg_core_1.timestamp)("processed_at")
});
exports.deliveryAttempts = (0, pg_core_1.pgTable)("delivery_attempts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    jobId: (0, pg_core_1.uuid)("job_id").notNull()
        .references(() => exports.jobs.id, { onDelete: "cascade" }),
    subscriberId: (0, pg_core_1.uuid)("subscriber_id").notNull()
        .references(() => exports.subscribers.id, { onDelete: "cascade" }),
    status: (0, pg_core_1.text)("status").notNull(),
    responseCode: (0, pg_core_1.integer)("response_code"),
    attempt: (0, pg_core_1.integer)("attempt").default(1),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow()
});
exports.pipelinesSteps = (0, pg_core_1.pgTable)("pipelines_steps", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    pipelineId: (0, pg_core_1.uuid)("pipeline_id").notNull()
        .references(() => exports.pipelines.id, { onDelete: "cascade" }),
    stepOrder: (0, pg_core_1.integer)("step_order").notNull(),
    stepType: (0, pg_core_1.text)("step_type").notNull(),
    stepConfig: (0, pg_core_1.jsonb)("step_config"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow()
});
