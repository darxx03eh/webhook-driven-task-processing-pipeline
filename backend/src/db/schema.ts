import {
    pgTable, uuid, text, timestamp,
    jsonb, integer
} from "drizzle-orm/pg-core";
import { create } from "node:domain";
import { url } from "node:inspector";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow()
});

export const pipelines = pgTable("pipelines", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    actionType: text("action_type").notNull(),
    actionsConfig: jsonb("actions_config"),
    webhookSecret: text("webhook_secret").notNull(),
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
    createdAt: timestamp("created_at").defaultNow(),
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