import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    API_PREFIX: z.string().default("/api"),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    JWT_ACCESS_SECRET: z.string().min(10, "JWT_ACCESS_SECRET must be at least 10 chars"),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_SECRET: z.string().min(10, "JWT_REFRESH_SECRET must be at least 10 chars"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("1d"),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),
    LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
    CORS_ORIGIN: z.string().default("*")
});

export const env = envSchema.parse(process.env);
