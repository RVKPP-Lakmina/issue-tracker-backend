import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { ApiError } from "../utils/ApiError";

export const errorHandler = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let statusCode = 500;
    let message = "Internal server error";
    let details: unknown;

    if (error instanceof ApiError) {
        statusCode = error.statusCode;
        message = error.message;
        details = error.details;
    } else if (error instanceof ZodError) {
        statusCode = 400;
        message = "Validation failed";
        details = error.flatten();
    } else if (error instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        message = "Database validation failed";
        details = error.errors;
    }

    if (error instanceof Error) {
        logger.error(error.message, { stack: error.stack });
    } else {
        logger.error("Non-error exception caught", { error });
    }

    const payload: Record<string, unknown> = { message };

    if (details) {
        payload.details = details;
    }

    if (env.NODE_ENV !== "production" && error instanceof Error) {
        payload.stack = error.stack;
    }

    res.status(statusCode).json(payload);
};
