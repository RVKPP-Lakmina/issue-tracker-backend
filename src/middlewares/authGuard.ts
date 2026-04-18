import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { isTokenBlacklisted } from "../config/redis";
import { verifyAccessToken } from "../utils/jwt";

export const authGuard = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const authorizationHeader = req.header("authorization");

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        next(new ApiError(401, "Missing or invalid Authorization header"));
        return;
    }

    const token = authorizationHeader.slice(7).trim();

    try {
        const blacklisted = await isTokenBlacklisted(token);
        if (blacklisted) {
            next(new ApiError(401, "Token is no longer valid"));
            return;
        }

        const payload = verifyAccessToken(token);
        req.user = payload;
        req.token = token;
        next();
    } catch {
        next(new ApiError(401, "Invalid or expired token"));
    }
};
