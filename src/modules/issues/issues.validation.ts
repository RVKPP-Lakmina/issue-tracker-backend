import { z } from "zod";

const issueStatus = z.enum(["open", "in-progress", "closed", "on-hold"]);
const issuePriority = z.enum(["low", "medium", "high", "critical"]);
const projectStatus = z.enum(["planning", "active", "on-hold", "closed"]);
const timeEntryActivity = z.enum(["analysis", "implementation", "testing", "review", "meeting"]);

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
        assignedToId: z.string().optional(),
        projectId: z.string().optional(),
        parentIssueId: z.string().optional()
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
            assignedToId: z.string().nullable().optional(),
            projectId: z.string().nullable().optional(),
            parentIssueId: z.string().nullable().optional()
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

export const listProjectsSchema = {
    query: z.object({
        search: z.string().optional(),
        status: projectStatus.optional(),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(10)
    })
};

export const createProjectSchema = {
    body: z.object({
        name: z.string().min(2).max(150),
        code: z.string().min(2).max(50).optional(),
        description: z.string().max(2000).optional(),
        status: projectStatus.default("active")
    })
};

export const updateProjectSchema = {
    params: z.object({
        id: z.string().min(1)
    }),
    body: z
        .object({
            name: z.string().min(2).max(150).optional(),
            code: z.string().min(2).max(50).nullable().optional(),
            description: z.string().max(2000).nullable().optional(),
            status: projectStatus.optional()
        })
        .refine((data) => Object.keys(data).length > 0, {
            message: "At least one field is required"
        })
};

export const listTimeEntriesSchema = {
    query: z.object({
        userId: z.string().optional(),
        issueId: z.string().optional(),
        projectId: z.string().optional(),
        activity: timeEntryActivity.optional(),
        fromDate: z.string().date().optional(),
        toDate: z.string().date().optional(),
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(10)
    })
};

export const createTimeEntrySchema = {
    body: z.object({
        issueId: z.string().min(1),
        date: z.string().date(),
        hours: z.number().positive(),
        activity: timeEntryActivity,
        comment: z.string().min(1).max(2000)
    })
};

export const timeEntriesReportSchema = {
    query: z.object({
        userId: z.string().optional(),
        issueId: z.string().optional(),
        projectId: z.string().optional(),
        activity: timeEntryActivity.optional(),
        fromDate: z.string().date().optional(),
        toDate: z.string().date().optional()
    })
};
