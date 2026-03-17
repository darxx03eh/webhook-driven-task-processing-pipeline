import { Request, Response, NextFunction } from "express";

export const rawBodyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let data = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    data += chunk;
  });
  req.on("end", () => {
    (
      req as Request & {
        rawBody?: string;
      }
    ).rawBody = data;
    try {
      req.body = data ? JSON.parse(data) : {};
      next();
    } catch {
      next();
    }
  });
  req.on("error", (err) => {
    next(err);
  });
};
