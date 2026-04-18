import type { Request, Response } from "express";
import { blacklistToken } from "../../config/redis";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { getTokenRemainingTtlSeconds } from "../../utils/jwt";
import { getCurrentUser, signIn, signUp } from "./auth.service";

export const signUpController = asyncHandler(async (req: Request, res: Response) => {
    const result = await signUp(req.body);
    res.status(201).json(result);
});

export const signInController = asyncHandler(async (req: Request, res: Response) => {
    const result = await signIn(req.body);
    res.status(200).json(result);
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const user = await getCurrentUser(req.user.sub);
    res.status(200).json(user);
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
    if (req.token) {
        const ttlSeconds = getTokenRemainingTtlSeconds(req.token);
        await blacklistToken(req.token, ttlSeconds);
    }

    res.status(200).json({ success: true });
});
