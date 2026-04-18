import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { searchCachedUsers } from "./core.service";
import type { ListUsersQuery } from "./core.validation";

export const listUsersController = asyncHandler(async (req: Request, res: Response) => {
    const { search, role, page = 1, pageSize = 10 } = req.query as unknown as ListUsersQuery;

    const users = await searchCachedUsers(search, role);

    const skip = (page - 1) * pageSize;
    const paginatedUsers = users.slice(skip, skip + pageSize);

    res.status(200).json({
        data: paginatedUsers,
        total: users.length,
        page,
        pageSize,
        totalPages: Math.ceil(users.length / pageSize)
    });
});
