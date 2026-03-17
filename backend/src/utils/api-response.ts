import { Response } from "express";
export const sendSuccessResponse = (
  res: Response,
  message: string,
  data: unknown = null,
  statusCode: number = 200,
): Response =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });

export const sendErrorResponse = (
  res: Response,
  message: string,
  code = "INTERNAL_SERVER_ERROR",
  statusCode: number = 500,
  details: unknown = null,
) =>
  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
  });
