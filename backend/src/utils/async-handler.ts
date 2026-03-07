import { Request, Response, RequestHandler, NextFunction } from "express";
type AsyncRouteHandlerr = (
    req: Request,
    res: Response,
    next?: NextFunction
) => unknown | Promise<unknown>;

export function asyncHandler(fn: AsyncRouteHandlerr): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}