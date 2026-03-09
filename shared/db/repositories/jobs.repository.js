"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markJobFilteredOut = exports.markJobFailed = exports.markJobCompleted = exports.markJobProcessing = exports.findPendingJob = exports.getJobById = exports.createJob = void 0;
const index_1 = require("../index");
const schema_1 = require("../schema");
const drizzle_orm_1 = require("drizzle-orm");
const createJob = async (input) => {
    const [job] = await index_1.db.insert(schema_1.jobs)
        .values({
        pipelineId: input.pipelineId,
        payload: input.payload,
        status: "pending",
        attempts: 0
    }).returning();
    return job;
};
exports.createJob = createJob;
const getJobById = async (jobId) => {
    return index_1.db.query.jobs.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.jobs.id, jobId)
    });
};
exports.getJobById = getJobById;
const findPendingJob = async () => {
    return index_1.db.query.jobs.findFirst({
        where: (0, drizzle_orm_1.eq)(schema_1.jobs.status, "pending"),
        orderBy: [(0, drizzle_orm_1.asc)(schema_1.jobs.createdAt)]
    });
};
exports.findPendingJob = findPendingJob;
const markJobProcessing = async (jobId) => {
    const [job] = await index_1.db.update(schema_1.jobs)
        .set({ status: "processing" }).where((0, drizzle_orm_1.eq)(schema_1.jobs.id, jobId))
        .returning();
    return job;
};
exports.markJobProcessing = markJobProcessing;
const markJobCompleted = async (jobId, result) => {
    const [job] = await index_1.db.update(schema_1.jobs)
        .set({
        status: "completed",
        result,
        error: null,
        stopReason: null,
        processedAt: new Date()
    }).where((0, drizzle_orm_1.eq)(schema_1.jobs.id, jobId)).returning();
    return job;
};
exports.markJobCompleted = markJobCompleted;
const markJobFailed = async (jobId, errorMessage) => {
    const [job] = await index_1.db.update(schema_1.jobs)
        .set({
        status: "failed",
        error: errorMessage,
        processedAt: new Date()
    }).where((0, drizzle_orm_1.eq)(schema_1.jobs.id, jobId)).returning();
    return job;
};
exports.markJobFailed = markJobFailed;
const markJobFilteredOut = async (jobId, result, stopReason) => {
    const [job] = await index_1.db.update(schema_1.jobs)
        .set({
        status: "filtered_out",
        result,
        stopReason,
        error: null,
        processedAt: new Date()
    }).where((0, drizzle_orm_1.eq)(schema_1.jobs.id, jobId)).returning();
    return job;
};
exports.markJobFilteredOut = markJobFilteredOut;
