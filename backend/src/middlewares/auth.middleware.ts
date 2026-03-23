import { NextFunction, Response } from "express";
import { AuthRequest } from "../types/auth-request";
import { verifyAccessToken } from "../utils/token";
import { sendErrorResponse } from "../utils/api-response";

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return sendErrorResponse(res, "Unauthorized", "UNAUTHORIZED", 401);
  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      username: decoded.username,
    };
    next();
  } catch {
    return sendErrorResponse(
      res,
      "Invalid or expired token",
      "INVALID_TOKEN",
      401,
    );
  }
};
