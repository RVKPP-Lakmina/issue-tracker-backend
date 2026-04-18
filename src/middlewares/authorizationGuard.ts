import type { NextFunction, Request, Response } from "express";
import type { AccessTokenPayload } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";

type Role = AccessTokenPayload["role"];

export const authorizationGuard = (...roles: Role[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new ApiError(401, "Unauthorized"));
            return;
        }

        if (!roles.includes(req.user.role)) {
            next(new ApiError(403, "Forbidden"));
            return;
        }

        next();
    };
};
