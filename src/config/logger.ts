import { createLogger, format, transports } from "winston";
import { env } from "./env";

const isProd = env.NODE_ENV === "production";

export const logger = createLogger({
    level: env.LOG_LEVEL,
    format: isProd
        ? format.combine(format.timestamp(), format.errors({ stack: true }), format.json())
        : format.combine(
            format.colorize(),
            format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            format.printf(({ timestamp, level, message, stack }) => {
                return stack
                    ? `[${timestamp}] ${level}: ${message}\n${stack}`
                    : `[${timestamp}] ${level}: ${message}`;
            })
        ),
    transports: [new transports.Console()]
});
