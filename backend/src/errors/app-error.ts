export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
  constructor(
    message: string,
    code = "INTERNAL_ERROR",
    statusCode = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
