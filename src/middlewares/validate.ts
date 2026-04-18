import type { NextFunction, Request, Response } from "express";
import { type ZodType, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

type ValidationSchema = {
    body?: ZodType;
    query?: ZodType;
    params?: ZodType;
};

export const validate = (schema: ValidationSchema) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body);
            }

            if (schema.query) {
                req.query = schema.query.parse(req.query) as Request["query"];
            }

            if (schema.params) {
                req.params = schema.params.parse(req.params) as Request["params"];
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(new ApiError(400, "Validation failed", error.flatten()));
                return;
            }

            next(error);
        }
    };
};
