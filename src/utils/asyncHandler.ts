import type { NextFunction, Request, Response, RequestHandler } from "express";

export const asyncHandler =
    (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
        (req, res, next) => {
            handler(req, res, next).catch(next);
        };
