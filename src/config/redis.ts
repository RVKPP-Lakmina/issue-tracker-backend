import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

let client: Redis | null = null;

export const getRedisClient = (): Redis => {
    if (!client) {
        client = new Redis(env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: true
        });

        client.on("connect", () => logger.info("Redis connected"));
        client.on("error", (error) => logger.error(`Redis error: ${error.message}`));
    }

    return client;
};

export const connectRedis = async (): Promise<void> => {
    const redis = getRedisClient();
    await redis.ping();
};

export const disconnectRedis = async (): Promise<void> => {
    if (client) {
        await client.quit();
        client = null;
        logger.info("Redis disconnected");
    }
};

export const pingRedis = async (): Promise<boolean> => {
    try {
        const redis = getRedisClient();
        const response = await redis.ping();
        return response === "PONG";
    } catch {
        return false;
    }
};

export const blacklistToken = async (token: string, ttlSeconds: number): Promise<void> => {
    if (ttlSeconds <= 0) {
        return;
    }

    const redis = getRedisClient();
    await redis.setex(`blacklist:${token}`, ttlSeconds, "1");
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
    const redis = getRedisClient();
    const value = await redis.get(`blacklist:${token}`);
    return value === "1";
};
