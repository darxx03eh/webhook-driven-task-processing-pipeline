import {  Response } from "express"
import { AuthRequest } from "../types/auth-request";
import {
    register, login,
    getCurrentUser
} from "../services/auth.service";
import { sendSuccessResponse } from "../utils/api-response";
import { AppError } from "../errors/app-error";

export const registerHandler = async (req: AuthRequest, res: Response) => {
    const { username, email, password } = req.body;
        if(!username || !email || !password)
            throw new AppError("Username, email, and password are required", "VALIDATIONS_ERROR", 400);
        const result = await register({ username, email, password });
        return sendSuccessResponse(res, "User registered successfully", result, 201);
}

export const loginHandler = async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;
    if(!email || !password)
        throw new AppError("Email and password are required", "VALIDATIONS_ERROR", 400);
    const result = await login({ email, password });
    return sendSuccessResponse(res, "User logged in successfully", result, 200);
}

export const meHandler = async (req: AuthRequest, res: Response) => {
    if(!req.user)
        throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    const user = await getCurrentUser(req.user.id);
    return sendSuccessResponse(res, "Current user retrieved successfully", { user }, 200);
}