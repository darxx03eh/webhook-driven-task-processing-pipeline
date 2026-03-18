import { Request, Response, RequestHandler, NextFunction } from "express";
import type { AsyncRouteHandler } from "../types/async-handler";

export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
