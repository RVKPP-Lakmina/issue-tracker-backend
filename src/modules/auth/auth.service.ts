import { User } from "../../models/User";
import { ApiError } from "../../utils/ApiError";
import { signAccessToken, type AccessTokenPayload } from "../../utils/jwt";

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

const toSafeUser = (user: { _id: unknown; name: string; email: string; role: "admin" | "user"; avatar?: string }) => {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
    };
};

const issueToken = (payload: AccessTokenPayload): string => signAccessToken(payload);

export const signUp = async (payload: SignUpInput) => {
    const existingUser = await User.findOne({ email: payload.email });

    if (existingUser) {
        throw new ApiError(409, "Email is already registered");
    }

    const user = await User.create(payload);
    const token = issueToken({ sub: String(user._id), email: user.email, role: user.role });

    return { token, user: toSafeUser(user) };
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

    const token = issueToken({ sub: String(user._id), email: user.email, role: user.role });

    return { token, user: toSafeUser(user) };
};

export const getCurrentUser = async (userId: string) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return toSafeUser(user);
};
