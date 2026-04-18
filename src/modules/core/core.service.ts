import { User } from "../../models/User";
import { getRedisClient } from "../../config/redis";

const USERS_CACHE_KEY = "active_users";
const CACHE_TTL = 300; // 5 minutes in seconds

export interface CachedUser {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
    avatar?: string;
}

/**
 * Get all active users from cache or database
 */
export const getAllActiveUsers = async (): Promise<CachedUser[]> => {
    const redis = getRedisClient();

    try {
        const cached = await redis.get(USERS_CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as CachedUser[];
        }
    } catch (error) {
        console.error("Error reading from cache:", error);
    }

    const users = await User.find({}).select("_id name email role avatar").lean();
    const cachedUsers: CachedUser[] = users.map((user) => ({
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
    }));

    try {
        await redis.setex(USERS_CACHE_KEY, CACHE_TTL, JSON.stringify(cachedUsers));
    } catch (error) {
        console.error("Error writing to cache:", error);
    }

    return cachedUsers;
};

/**
 * Invalidate users cache (call after user creation/deletion)
 */
export const invalidateUsersCache = async (): Promise<void> => {
    const redis = getRedisClient();
    try {
        await redis.del(USERS_CACHE_KEY);
    } catch (error) {
        console.error("Error invalidating cache:", error);
    }
};

/**
 * Search users from cache with filters
 */
export const searchCachedUsers = async (
    search?: string,
    role?: "admin" | "user"
): Promise<CachedUser[]> => {
    const users = await getAllActiveUsers();

    let filtered = users;

    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
            (user) =>
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
        );
    }

    if (role) {
        filtered = filtered.filter((user) => user.role === role);
    }

    return filtered;
};
