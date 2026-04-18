import { z } from "zod";

const email = z.string().email();
const password = z.string().min(8).max(72);

export const signUpSchema = {
    body: z.object({
        name: z.string().min(2).max(100),
        email,
        password,
        avatar: z.string().url().optional()
    })
};

export const signInSchema = {
    body: z.object({
        email,
        password
    })
};
