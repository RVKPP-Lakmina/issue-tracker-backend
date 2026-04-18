import { Types } from "mongoose";
import { User } from "../models/User";
import { ApiError } from "./ApiError";

export const isValidObjectId = (id: string): boolean => {
    return Types.ObjectId.isValid(id);
};

export const toObjectId = (id: string): Types.ObjectId => {
    if (!isValidObjectId(id)) {
        throw new Error(`Invalid ObjectId format: ${id}`);
    }
    return new Types.ObjectId(id);
};

export const validateUserExists = async (userId: string): Promise<void> => {
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, `Invalid user ID format: ${userId}`);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, `User not found: ${userId}`);
    }
};
