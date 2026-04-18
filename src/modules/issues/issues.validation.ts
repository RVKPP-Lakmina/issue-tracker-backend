import { z } from "zod";

const issueStatus = z.enum(["open", "in-progress", "closed", "on-hold"]);
const issuePriority = z.enum(["low", "medium", "high", "critical"]);

export const listIssuesSchema = {
    query: z.object({
        search: z.string().optional(),
        status: issueStatus.optional(),
        priority: issuePriority.optional(),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(10)
    })
};

export const createIssueSchema = {
    body: z.object({
        title: z.string().min(3).max(200),
        description: z.string().min(3).max(5000),
        status: issueStatus.default("open"),
        priority: issuePriority.default("medium"),
        assignedToId: z.string().optional()
    })
};

export const updateIssueSchema = {
    params: z.object({
        id: z.string().min(1)
    }),
    body: z
        .object({
            title: z.string().min(3).max(200).optional(),
            description: z.string().min(3).max(5000).optional(),
            status: issueStatus.optional(),
            priority: issuePriority.optional(),
            assignedToId: z.string().nullable().optional()
        })
        .refine((data) => Object.keys(data).length > 0, {
            message: "At least one field is required"
        })
};

export const issueIdParamsSchema = {
    params: z.object({
        id: z.string().min(1)
    })
};
