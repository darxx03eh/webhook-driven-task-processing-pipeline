import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

const mapDatabaseError = (err: unknown) => {
  if (!err || typeof err !== "object") return null;

  const error = err as { code?: string; constraint?: string };
  if (error.code !== "23505") return null;

  if (error.constraint === "subscribers_pipeline_id_url_unique") {
    return {
      statusCode: 409,
      message: "Subscriber URL already exists in this pipeline",
      code: "SUBSCRIBER_URL_CONFLICT",
    };
  }

  if (error.constraint === "pipelines_steps_pipeline_id_step_order_unique") {
    return {
      statusCode: 409,
      message: "stepOrder already exists in this pipeline",
      code: "PIPELINE_STEP_ORDER_CONFLICT",
    };
  }

  if (error.constraint === "pipelines_name_unique") {
    return {
      statusCode: 409,
      message: "Pipeline name already exists",
      code: "PIPELINE_NAME_CONFLICT",
    };
  }

  return {
    statusCode: 409,
    message: "Duplicate resource",
    code: "UNIQUE_CONSTRAINT_VIOLATION",
  };
};

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const dbError = mapDatabaseError(err);
  if (dbError) {
    return res.status(dbError.statusCode).json({
      success: false,
      message: dbError.message,
      error: {
        code: dbError.code,
        details: null,
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code,
        details: err.details ?? null,
      },
    });
  }
  console.error("Unexpected error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    error: {
      code: "INTERNAL_SERVER_ERROR",
      details: null,
    },
  });
};
