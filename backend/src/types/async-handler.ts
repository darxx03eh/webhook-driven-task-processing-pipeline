import type { NextFunction, Request, Response } from "express";

export type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next?: NextFunction,
) => unknown | Promise<unknown>;
