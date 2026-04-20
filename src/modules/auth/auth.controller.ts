import type { Request, Response } from "express";
import { env } from "../../config/env";
import { blacklistToken, revokeRefreshToken } from "../../config/redis";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { getTokenRemainingTtlSeconds, verifyRefreshToken } from "../../utils/jwt";
import { getCurrentUser, refreshSession, signIn, signUp } from "./auth.service";

const REFRESH_TOKEN_COOKIE = "refresh_token";
const TOKEN_FOOTPRINT_COOKIE = "token_fp";

const getCookieValue = (req: Request, cookieName: string): string | undefined => {
    const cookieHeader = req.header("cookie");

    if (!cookieHeader) {
        return undefined;
    }

    const cookies = cookieHeader.split(";").map((entry) => entry.trim());
    const matchingCookie = cookies.find((entry) => entry.startsWith(`${cookieName}=`));

    if (!matchingCookie) {
        return undefined;
    }

    return decodeURIComponent(matchingCookie.slice(cookieName.length + 1));
};

const buildCookieOptions = (maxAgeMs: number) => ({
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeMs
});

const setSessionCookies = (res: Response, refreshToken: string, tokenFootprint: string): void => {
    const refreshTokenTtl = getTokenRemainingTtlSeconds(refreshToken);
    const maxAgeMs = Math.max(1000, refreshTokenTtl * 1000);

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, buildCookieOptions(maxAgeMs));
    res.cookie(TOKEN_FOOTPRINT_COOKIE, tokenFootprint, buildCookieOptions(maxAgeMs));
};

const clearSessionCookies = (res: Response): void => {
    const baseOptions = {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/"
    };

    res.clearCookie(REFRESH_TOKEN_COOKIE, baseOptions);
    res.clearCookie(TOKEN_FOOTPRINT_COOKIE, baseOptions);
};

export const signUpController = asyncHandler(async (req: Request, res: Response) => {
    const result = await signUp(req.body);
    setSessionCookies(res, result.refreshToken, result.tokenFootprint);

    res.status(201).json({ token: result.token, user: result.user });
});

export const signInController = asyncHandler(async (req: Request, res: Response) => {
    const result = await signIn(req.body);
    setSessionCookies(res, result.refreshToken, result.tokenFootprint);

    res.status(200).json({ token: result.token, user: result.user });
});

export const refreshController = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = getCookieValue(req, REFRESH_TOKEN_COOKIE);
    const tokenFootprint = getCookieValue(req, TOKEN_FOOTPRINT_COOKIE);

    if (!refreshToken) {
        throw new ApiError(401, "Missing refresh token");
    }

    const session = await refreshSession({ refreshToken, tokenFootprint });
    setSessionCookies(res, session.refreshToken, session.tokenFootprint);

    res.status(200).json({ token: session.token });
});

export const meController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const user = await getCurrentUser(req.user.sub);
    res.status(200).json(user);
});

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
    const authorizationHeader = req.header("authorization");
    const bearerToken = authorizationHeader?.startsWith("Bearer ") ? authorizationHeader.slice(7).trim() : undefined;
    const accessToken = req.token ?? bearerToken;
    const refreshToken = getCookieValue(req, REFRESH_TOKEN_COOKIE);

    if (accessToken) {
        const ttlSeconds = getTokenRemainingTtlSeconds(accessToken);
        await blacklistToken(accessToken, ttlSeconds);
    }

    if (refreshToken) {
        try {
            const payload = verifyRefreshToken(refreshToken);
            const ttlSeconds = getTokenRemainingTtlSeconds(refreshToken);
            await revokeRefreshToken(payload.jti, ttlSeconds);
        } catch {
            // Ignore invalid refresh tokens during logout and still clear cookies.
        }
    }

    clearSessionCookies(res);

    res.status(200).json({ success: true });
});
