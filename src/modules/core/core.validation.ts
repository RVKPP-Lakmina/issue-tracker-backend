import { z } from "zod";

export const listUsersQuerySchema = z.object({
    search: z.string().optional(),
    role: z.enum(["admin", "user"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10)
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
