import { banTokenFootprint, isRefreshTokenRevoked, isTokenFootprintBanned, revokeRefreshToken } from "../../config/redis";
import { User } from "../../models/User";
import { ApiError } from "../../utils/ApiError";
import {
    createAccessTokenPayload,
    createRefreshTokenPayload,
    createTokenFootprint,
    getTokenRemainingTtlSeconds,
    hashTokenFootprint,
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken
} from "../../utils/jwt";
import { invalidateUsersCache } from "../core/core.service";

type SignUpInput = {
    name: string;
    email: string;
    password: string;
    avatar?: string;
};

type SignInInput = {
    email: string;
    password: string;
};

type RefreshSessionInput = {
    refreshToken: string;
    tokenFootprint?: string;
};

type AuthSession = {
    token: string;
    refreshToken: string;
    tokenFootprint: string;
};

const toSafeUser = (user: { _id: unknown; name: string; email: string; role: "admin" | "user"; avatar?: string }) => {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
    };
};

const issueSessionTokens = (payload: { sub: string; email: string; role: "admin" | "user" }): AuthSession => {
    const tokenFootprint = createTokenFootprint();
    const fpHash = hashTokenFootprint(tokenFootprint);

    const token = signAccessToken(createAccessTokenPayload(payload));
    const refreshToken = signRefreshToken(createRefreshTokenPayload(payload, fpHash));

    return { token, refreshToken, tokenFootprint };
};

export const signUp = async (payload: SignUpInput) => {
    const existingUser = await User.findOne({ email: payload.email });

    if (existingUser) {
        throw new ApiError(409, "Email is already registered");
    }

    const user = await User.create(payload);
    const session = issueSessionTokens({ sub: String(user._id), email: user.email, role: user.role });

    await invalidateUsersCache();

    return { ...session, user: toSafeUser(user) };
};

export const signIn = async (payload: SignInInput) => {
    const user = await User.findOne({ email: payload.email }).select("+password");

    if (!user) {
        throw new ApiError(401, "Invalid email or password");
    }

    const passwordMatches = await user.comparePassword(payload.password);

    if (!passwordMatches) {
        throw new ApiError(401, "Invalid email or password");
    }

    const session = issueSessionTokens({ sub: String(user._id), email: user.email, role: user.role });

    return { ...session, user: toSafeUser(user) };
};

export const refreshSession = async (payload: RefreshSessionInput) => {
    let verifiedRefreshToken: ReturnType<typeof verifyRefreshToken>;

    try {
        verifiedRefreshToken = verifyRefreshToken(payload.refreshToken);
    } catch {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const [isRevoked, isFootprintBanned] = await Promise.all([
        isRefreshTokenRevoked(verifiedRefreshToken.jti),
        isTokenFootprintBanned(verifiedRefreshToken.fpHash)
    ]);

    if (isRevoked || isFootprintBanned) {
        throw new ApiError(401, "Refresh token is no longer valid");
    }

    const incomingFootprintHash = payload.tokenFootprint ? hashTokenFootprint(payload.tokenFootprint) : "";
    const refreshTokenTtl = getTokenRemainingTtlSeconds(payload.refreshToken);

    if (!payload.tokenFootprint || incomingFootprintHash !== verifiedRefreshToken.fpHash) {
        await Promise.all([
            revokeRefreshToken(verifiedRefreshToken.jti, refreshTokenTtl),
            banTokenFootprint(verifiedRefreshToken.fpHash, refreshTokenTtl)
        ]);

        throw new ApiError(401, "Suspicious session detected. Please sign in again");
    }

    await revokeRefreshToken(verifiedRefreshToken.jti, refreshTokenTtl);

    return issueSessionTokens({
        sub: verifiedRefreshToken.sub,
        email: verifiedRefreshToken.email,
        role: verifiedRefreshToken.role
    });
};

export const getCurrentUser = async (userId: string) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return toSafeUser(user);
};
