import {
    pgTable, uuid, text, timestamp,
    jsonb, integer
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow()
});

export const pipelines = pgTable("pipelines", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    webhookSecret: text("webhook_secret").notNull(),
    webhookPath: text("webhook_path").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow()
});

export const subscribers = pgTable("subscribers", {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id").notNull()
    .references(() => pipelines.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret"),
    createdAt: timestamp("created_at").defaultNow()
});

export const jobs = pgTable("jobs", {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id").notNull()
    .references(() => pipelines.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    result: jsonb("result"),
    error: text("error"),
    stopReason: text("stop_reason"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    processedAt: timestamp("processed_at")
});

export const deliveryAttempts = pgTable("delivery_attempts", {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id").notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
    subscriberId: uuid("subscriber_id").notNull()
    .references(() => subscribers.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    responseCode: integer("response_code"),
    attempt: integer("attempt").default(1),
    createdAt: timestamp("created_at").defaultNow()
});

export const pipelinesSteps = pgTable("pipelines_steps", {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id").notNull()
    .references(() => pipelines.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    stepType: text("step_type").notNull(),
    stepConfig: jsonb("step_config"),
    createdAt: timestamp("created_at").defaultNow()
});