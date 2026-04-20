import { createHash, randomBytes, randomUUID } from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

type AuthBasePayload = {
    sub: string;
    email: string;
    role: "admin" | "user";
};

export type AccessTokenPayload = AuthBasePayload & {
    jti: string;
    typ: "access";
};

export type RefreshTokenPayload = AuthBasePayload & {
    jti: string;
    typ: "refresh";
    fpHash: string;
};

const createSignOptions = (expiresIn: SignOptions["expiresIn"]): SignOptions => ({ expiresIn });

export const createAccessTokenPayload = (payload: AuthBasePayload): AccessTokenPayload => ({
    ...payload,
    jti: randomUUID(),
    typ: "access"
});

export const createRefreshTokenPayload = (payload: AuthBasePayload, fpHash: string): RefreshTokenPayload => ({
    ...payload,
    jti: randomUUID(),
    typ: "refresh",
    fpHash
});

export const createTokenFootprint = (): string => randomBytes(32).toString("hex");

export const hashTokenFootprint = (tokenFootprint: string): string => {
    return createHash("sha256").update(tokenFootprint).digest("hex");
};

export const signAccessToken = (payload: AccessTokenPayload): string => {
    const options = createSignOptions(env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"]);
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
    const options = createSignOptions(env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"]);
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

export const getTokenRemainingTtlSeconds = (token: string): number => {
    const decoded = jwt.decode(token, { json: true }) as { exp?: number } | null;

    if (!decoded?.exp) {
        return 0;
    }

    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
};
