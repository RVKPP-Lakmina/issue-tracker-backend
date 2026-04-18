import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Issue } from "../../models/Issue";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import { validateUserExists } from "../../utils/objectId";

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
            .populate("assignedTo", "name email avatar")
            .populate("createdBy", "name email avatar")
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

    const { title, description, status, priority, assignedToId } = req.body as {
        title: string;
        description: string;
        status: "open" | "in-progress" | "closed" | "on-hold";
        priority: "low" | "medium" | "high" | "critical";
        assignedToId?: string;
    };

    if (assignedToId) {
        await validateUserExists(assignedToId);
    }

    const issue = await Issue.create({
        title,
        description,
        status,
        priority,
        assignedTo: assignedToId ? new mongoose.Types.ObjectId(assignedToId) : null,
        createdBy: req.user.sub
    });

    const payload = await Issue.findById(issue._id)
        .populate("assignedTo", "name email avatar")
        .populate("createdBy", "name email avatar");

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
    };

    if (updates.assignedToId) {
        await validateUserExists(updates.assignedToId);
    }

    if (updates.title !== undefined) issue.title = updates.title;
    if (updates.description !== undefined) issue.description = updates.description;
    if (updates.status !== undefined) issue.status = updates.status;
    if (updates.priority !== undefined) issue.priority = updates.priority;
    if (updates.assignedToId !== undefined) {
        issue.assignedTo = updates.assignedToId ? new mongoose.Types.ObjectId(updates.assignedToId) : null;
    }

    await issue.save();

    const payload = await Issue.findById(issue._id)
        .populate("assignedTo", "name email avatar")
        .populate("createdBy", "name email avatar");

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
