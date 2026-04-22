import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Issue } from "../../models/Issue";
import { Project } from "../../models/Project";
import { TimeEntry } from "../../models/TimeEntry";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { isValidObjectId, validateUserExists } from "../../utils/objectId";

type TimeEntriesQuery = {
    userId?: string;
    issueId?: string;
    projectId?: string;
    activity?: "analysis" | "implementation" | "testing" | "review" | "meeting";
    fromDate?: string;
    toDate?: string;
};

const buildTimeEntriesFilter = (query: TimeEntriesQuery): Record<string, unknown> => {
    const filters: Record<string, unknown> = {};

    if (query.userId) {
        if (!isValidObjectId(query.userId)) {
            throw new ApiError(400, `Invalid user ID format: ${query.userId}`);
        }
        filters.user = new mongoose.Types.ObjectId(query.userId);
    }

    if (query.issueId) {
        if (!isValidObjectId(query.issueId)) {
            throw new ApiError(400, `Invalid issue ID format: ${query.issueId}`);
        }
        filters.issue = new mongoose.Types.ObjectId(query.issueId);
    }

    if (query.projectId) {
        if (!isValidObjectId(query.projectId)) {
            throw new ApiError(400, `Invalid project ID format: ${query.projectId}`);
        }
        filters.project = new mongoose.Types.ObjectId(query.projectId);
    }

    if (query.activity) {
        filters.activity = query.activity;
    }

    if (query.fromDate || query.toDate) {
        const dateFilter: Record<string, Date> = {};
        if (query.fromDate) {
            dateFilter.$gte = new Date(query.fromDate);
        }
        if (query.toDate) {
            dateFilter.$lte = new Date(query.toDate);
        }
        filters.date = dateFilter;
    }

    return filters;
};

const escapeCsv = (value: unknown): string => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
};

export const listIssuesController = asyncHandler(async (req: Request, res: Response) => {
    const { search, status, priority, page = 1, pageSize = 10 } = req.query as unknown as {
        search?: string;
        status?: string;
        priority?: string;
        page: number;
        pageSize: number;
    };

    const filters: Record<string, unknown> = {};

    if (search) {
        filters.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    if (status) {
        filters.status = status;
    }

    if (priority) {
        filters.priority = priority;
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
        Issue.find(filters)
            .populate("assignedTo", "name avatar")
            .populate("project", "_id name")
            .populate("createdBy", "_id name")
            .populate("parentIssue", "_id title status")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize),
        Issue.countDocuments(filters)
    ]);

    res.status(200).json({
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    });
});

export const createIssueController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const { title, description, status, priority, assignedToId, projectId, parentIssueId } = req.body as {
        title: string;
        description: string;
        status: "open" | "in-progress" | "closed" | "on-hold";
        priority: "low" | "medium" | "high" | "critical";
        assignedToId?: string;
        projectId?: string;
        parentIssueId?: string;
    };

    if (assignedToId) {
        await validateUserExists(assignedToId);
    }

    if (projectId) {
        if (!isValidObjectId(projectId)) {
            throw new ApiError(400, `Invalid project ID format: ${projectId}`);
        }

        const project = await Project.findById(projectId);

        if (!project) {
            throw new ApiError(404, "Project not found");
        }

        if (project.status === "closed") {
            throw new ApiError(400, "Cannot create issue under a closed project");
        }
    }

    if (parentIssueId) {
        if (!isValidObjectId(parentIssueId)) {
            throw new ApiError(400, `Invalid parent issue ID format: ${parentIssueId}`);
        }

        const parentIssue = await Issue.findById(parentIssueId);

        if (!parentIssue) {
            throw new ApiError(404, "Parent issue not found");
        }

        if (parentIssue.status === "closed") {
            throw new ApiError(400, "Cannot create sub-ticket under a closed parent ticket");
        }
    }

    const issue = await Issue.create({
        title,
        description,
        status,
        priority,
        project: projectId ? new mongoose.Types.ObjectId(projectId) : null,
        parentIssue: parentIssueId ? new mongoose.Types.ObjectId(parentIssueId) : null,
        assignedTo: assignedToId ? new mongoose.Types.ObjectId(assignedToId) : null,
        createdBy: req.user.sub
    });

    const payload = await Issue.findById(issue._id)
        .populate("assignedTo", "name email avatar")
        .populate("project", "name code status")
        .populate("parentIssue", "title status")
        .populate("createdBy", "_id name");

    res.status(201).json(payload);
});

export const updateIssueController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
        throw new ApiError(404, "Issue not found");
    }

    const isOwner = String(issue.createdBy) === req.user.sub;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
        throw new ApiError(403, "Forbidden");
    }

    const updates = req.body as {
        title?: string;
        description?: string;
        status?: "open" | "in-progress" | "closed" | "on-hold";
        priority?: "low" | "medium" | "high" | "critical";
        assignedToId?: string | null;
        projectId?: string | null;
        parentIssueId?: string | null;
    };

    if (updates.assignedToId) {
        await validateUserExists(updates.assignedToId);
    }

    if (updates.projectId) {
        if (!isValidObjectId(updates.projectId)) {
            throw new ApiError(400, `Invalid project ID format: ${updates.projectId}`);
        }

        const project = await Project.findById(updates.projectId);

        if (!project) {
            throw new ApiError(404, "Project not found");
        }

        if (project.status === "closed") {
            throw new ApiError(400, "Cannot move issue to a closed project");
        }
    }

    if (updates.parentIssueId) {
        if (!isValidObjectId(updates.parentIssueId)) {
            throw new ApiError(400, `Invalid parent issue ID format: ${updates.parentIssueId}`);
        }

        if (updates.parentIssueId === String(issue._id)) {
            throw new ApiError(400, "Issue cannot be parent of itself");
        }

        const parentIssue = await Issue.findById(updates.parentIssueId);

        if (!parentIssue) {
            throw new ApiError(404, "Parent issue not found");
        }

        if (parentIssue.status === "closed") {
            throw new ApiError(400, "Cannot set a closed parent ticket");
        }
    }

    if (updates.title !== undefined) issue.title = updates.title;
    if (updates.description !== undefined) issue.description = updates.description;
    if (updates.status !== undefined) issue.status = updates.status;
    if (updates.priority !== undefined) issue.priority = updates.priority;
    if (updates.assignedToId !== undefined) {
        issue.assignedTo = updates.assignedToId ? new mongoose.Types.ObjectId(updates.assignedToId) : null;
    }
    if (updates.projectId !== undefined) {
        issue.project = updates.projectId ? new mongoose.Types.ObjectId(updates.projectId) : null;
    }
    if (updates.parentIssueId !== undefined) {
        issue.parentIssue = updates.parentIssueId ? new mongoose.Types.ObjectId(updates.parentIssueId) : null;
    }

    await issue.save();

    const payload = await Issue.findById(issue._id)
        .populate("assignedTo", "name email avatar")
        .populate("project", "name code status")
        .populate("parentIssue", "title status")
        .populate("createdBy", "_id name");

    res.status(200).json(payload);
});

export const deleteIssueController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
        throw new ApiError(404, "Issue not found");
    }

    const isOwner = String(issue.createdBy) === req.user.sub;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
        throw new ApiError(403, "Forbidden");
    }

    await issue.deleteOne();

    res.status(204).send();
});

export const listProjectsController = asyncHandler(async (req: Request, res: Response) => {
    const { search, status, page = 1, pageSize = 10 } = req.query as unknown as {
        search?: string;
        status?: "planning" | "active" | "on-hold" | "closed";
        page: number;
        pageSize: number;
    };

    const filters: Record<string, unknown> = {};

    if (search) {
        filters.$or = [
            { name: { $regex: search, $options: "i" } },
            { code: { $regex: search, $options: "i" } }
        ];
    }

    if (status) {
        filters.status = status;
    }

    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
        Project.find(filters)
            .populate("createdBy", "_id name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize),
        Project.countDocuments(filters)
    ]);

    res.status(200).json({
        success: true,
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    });
});

export const createProjectController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const { name, code, description, status } = req.body as {
        name: string;
        code?: string;
        description?: string;
        status?: "planning" | "active" | "on-hold" | "closed";
    };

    const project = await Project.create({
        name,
        code,
        description,
        status,
        createdBy: req.user.sub
    });

    const payload = await Project.findById(project._id).populate("createdBy", "_id name");

    res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: payload
    });
});

export const updateProjectController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const { name, code, description, status } = req.body as {
        name?: string;
        code?: string | null;
        description?: string | null;
        status?: "planning" | "active" | "on-hold" | "closed";
    };

    if (name !== undefined) project.name = name;
    if (code !== undefined) project.code = code || undefined;
    if (description !== undefined) project.description = description || undefined;
    if (status !== undefined) project.status = status;

    await project.save();

    const payload = await Project.findById(project._id).populate("createdBy", "_id name");

    res.status(200).json({
        success: true,
        message: "Project updated successfully",
        data: payload
    });
});

export const listTimeEntriesController = asyncHandler(async (req: Request, res: Response) => {
    const {
        userId,
        issueId,
        projectId,
        activity,
        fromDate,
        toDate,
        page = 1,
        pageSize = 10
    } = req.query as unknown as TimeEntriesQuery & { page: number; pageSize: number };

    const filters = buildTimeEntriesFilter({ userId, issueId, projectId, activity, fromDate, toDate });
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
        TimeEntry.find(filters)
            .populate("issue", "title status")
            .populate("project", "name code status")
            .populate("user", "name email avatar")
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(pageSize),
        TimeEntry.countDocuments(filters)
    ]);

    res.status(200).json({
        success: true,
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    });
});

export const createTimeEntryController = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const { issueId, date, hours, activity, comment } = req.body as {
        issueId: string;
        date: string;
        hours: number;
        activity: "analysis" | "implementation" | "testing" | "review" | "meeting";
        comment: string;
    };

    if (!isValidObjectId(issueId)) {
        throw new ApiError(400, `Invalid issue ID format: ${issueId}`);
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
        throw new ApiError(404, "Issue not found");
    }

    const timeEntry = await TimeEntry.create({
        issue: issue._id,
        project: issue.project ?? null,
        user: req.user.sub,
        date: new Date(date),
        hours,
        activity,
        comment
    });

    const payload = await TimeEntry.findById(timeEntry._id)
        .populate("issue", "title status")
        .populate("project", "name code status")
        .populate("user", "name email avatar");

    res.status(201).json({
        success: true,
        message: "Time entry created successfully",
        data: payload
    });
});

export const exportTimeEntriesCsvController = asyncHandler(async (req: Request, res: Response) => {
    const { userId, issueId, projectId, activity, fromDate, toDate } = req.query as unknown as TimeEntriesQuery;

    const filters = buildTimeEntriesFilter({ userId, issueId, projectId, activity, fromDate, toDate });

    const rows = await TimeEntry.find(filters)
        .populate("issue", "title")
        .populate("project", "name code")
        .populate("user", "name email")
        .sort({ date: -1, createdAt: -1 });

    const csvHeader = ["id", "date", "hours", "activity", "comment", "issue", "project", "user"];
    const csvRows = rows.map((entry) => {
        const issueTitle = (entry.issue as { title?: string } | null)?.title ?? "";
        const projectName = (entry.project as { name?: string; code?: string } | null)?.name ?? "";
        const userName = (entry.user as { name?: string; email?: string } | null)?.name ?? "";

        return [
            escapeCsv((entry as any).id ?? entry._id),
            escapeCsv(entry.date.toISOString().split("T")[0]),
            escapeCsv(entry.hours),
            escapeCsv(entry.activity),
            escapeCsv(entry.comment),
            escapeCsv(issueTitle),
            escapeCsv(projectName),
            escapeCsv(userName)
        ].join(",");
    });

    const csvContent = [csvHeader.join(","), ...csvRows].join("\n");
    const filename = `spent-time-${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
});
