import { Response } from "express";
import { sendSuccessResponse } from "../utils/api-response";
import { AppError } from "../errors/app-error";
import { AuthRequest } from "../types/auth-request";
import { getMetricsSnapshotService } from "../services/metrics.service";

export const getMetricsSnapshotHandler = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        throw new AppError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const metrics = await getMetricsSnapshotService(req.user.id);
    return sendSuccessResponse(res, "Metrics snapshot fetched", { metrics });
};
