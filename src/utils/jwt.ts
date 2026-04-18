import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export type AccessTokenPayload = {
    sub: string;
    email: string;
    role: "admin" | "user";
};

export const signAccessToken = (payload: AccessTokenPayload): string => {
    const options: SignOptions = {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"]
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
};

export const getTokenRemainingTtlSeconds = (token: string): number => {
    const decoded = jwt.decode(token, { json: true }) as { exp?: number } | null;

    if (!decoded?.exp) {
        return 0;
    }

    return Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
};
