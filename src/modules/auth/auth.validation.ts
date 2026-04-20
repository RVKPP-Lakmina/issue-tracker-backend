import { z } from "zod";

const email = z.preprocess(
    (value) => {
        if (typeof value !== "string") {
            return value;
        }

        return value.trim().toLowerCase();
    },
    z.email()
);
const password = z.string().min(8).max(72);
const avatar = z.preprocess(
    (value) => {
        if (value === null || value === undefined) {
            return undefined;
        }

        if (typeof value !== "string") {
            return value;
        }

        const normalized = value.trim();
        return normalized.length === 0 ? undefined : normalized;
    },
    z.url().optional()
);

export const signUpSchema = {
    body: z.object({
        name: z.string().trim().min(2).max(100),
        email,
        password,
        avatar
    })
};

export const signInSchema = {
    body: z.object({
        email,
        password
    })
};
