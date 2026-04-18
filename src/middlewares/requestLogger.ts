import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now();

    res.on("finish", () => {
        const durationMs = Date.now() - startedAt;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`);
    });

    next();
};
