import request from "supertest";
import type { Express } from "express";
import mongoose from "mongoose";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.API_PREFIX = "/api";
process.env.MONGODB_URI = "mongodb://localhost:27017/issue_tracker_test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = "this-is-a-test-secret-123";
process.env.JWT_REFRESH_SECRET = "this-is-a-refresh-test-secret-123";

const authPayload = {
    sub: "507f1f77bcf86cd799439011",
    email: "admin@example.com",
    role: "admin" as const
};

const searchCachedUsersMock = vi.fn();
const invalidateUsersCacheMock = vi.fn();

const issueModelMock = {
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    findById: vi.fn()
};

const projectModelMock = {
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    findById: vi.fn()
};

const timeEntryModelMock = {
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    findById: vi.fn()
};

const createQueryMock = <T>(value: T) => {
    const query: Record<string, unknown> = {};

    query.populate = vi.fn(() => query);
    query.sort = vi.fn(() => query);
    query.skip = vi.fn(() => query);
    query.limit = vi.fn(() => query);
    query.then = (resolve: (value: T) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(value).then(resolve, reject);
    query.catch = (reject: (reason?: unknown) => unknown) => Promise.resolve(value).catch(reject);

    return query as T & {
        populate: ReturnType<typeof vi.fn>;
        sort: ReturnType<typeof vi.fn>;
        skip: ReturnType<typeof vi.fn>;
        limit: ReturnType<typeof vi.fn>;
        then: (resolve: (value: T) => unknown, reject: (reason?: unknown) => unknown) => Promise<unknown>;
        catch: (reject: (reason?: unknown) => unknown) => Promise<unknown>;
    };
};

vi.mock("../config/redis", () => ({
    isTokenBlacklisted: vi.fn().mockResolvedValue(false),
    blacklistToken: vi.fn(),
    pingRedis: vi.fn().mockResolvedValue(true),
    getRedisClient: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyAccessToken: vi.fn((token: string) => {
        if (token !== "test-token") {
            throw new Error("Invalid token");
        }

        return authPayload;
    }),
    getTokenRemainingTtlSeconds: vi.fn().mockReturnValue(60),
    signAccessToken: vi.fn()
}));

vi.mock("../modules/core/core.service", () => ({
    searchCachedUsers: searchCachedUsersMock,
    invalidateUsersCache: invalidateUsersCacheMock,
    getAllActiveUsers: vi.fn()
}));

vi.mock("../models/Issue", () => ({
    Issue: issueModelMock
}));

vi.mock("../models/Project", () => ({
    Project: projectModelMock
}));

vi.mock("../models/TimeEntry", () => ({
    TimeEntry: timeEntryModelMock
}));

let app: Express;

beforeAll(async () => {
    ({ app } = await import("../app.js"));
});

beforeEach(() => {
    vi.clearAllMocks();

    searchCachedUsersMock.mockResolvedValue([
        {
            id: "u1",
            name: "John Doe",
            email: "john@example.com",
            role: "user",
            avatar: null
        },
        {
            id: "u2",
            name: "Jane Admin",
            email: "jane@example.com",
            role: "admin",
            avatar: null
        }
    ]);

    issueModelMock.find.mockReturnValue(createQueryMock([{ id: "issue-1", title: "Issue 1" }]));
    issueModelMock.countDocuments.mockResolvedValue(1);
    issueModelMock.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012") });
    issueModelMock.findById.mockReturnValue(
        createQueryMock({
            id: "issue-1",
            _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
            title: "Issue 1",
            status: "open",
            project: null
        })
    );

    projectModelMock.find.mockReturnValue(
        createQueryMock([
            {
                id: "project-1",
                name: "Project A",
                code: "PA",
                status: "active"
            }
        ])
    );
    projectModelMock.countDocuments.mockResolvedValue(1);
    projectModelMock.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013") });
    projectModelMock.findById.mockReturnValue(
        createQueryMock({
            id: "project-1",
            _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
            name: "Project A",
            code: "PA",
            status: "active",
            save: vi.fn().mockResolvedValue(undefined)
        })
    );

    timeEntryModelMock.find.mockReturnValue(
        createQueryMock([
            {
                id: "entry-1",
                date: new Date("2026-04-19T00:00:00.000Z"),
                hours: 2,
                activity: "implementation",
                comment: "Worked on core APIs",
                issue: { title: "Issue 1" },
                project: { name: "Project A", code: "PA" },
                user: { name: "John Doe", email: "john@example.com" }
            }
        ])
    );
    timeEntryModelMock.countDocuments.mockResolvedValue(1);
    timeEntryModelMock.create.mockResolvedValue({ _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014") });
    timeEntryModelMock.findById.mockReturnValue(
        createQueryMock({
            id: "entry-1",
            _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
            date: new Date("2026-04-19T00:00:00.000Z"),
            hours: 2,
            activity: "implementation",
            comment: "Worked on core APIs"
        })
    );
});

describe("new backend endpoints", () => {
    it("returns cached users from GET /api/core/users", async () => {
        const response = await request(app).get("/api/core/users?page=1&pageSize=1");

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            total: 2,
            page: "1",
            pageSize: "1",
            totalPages: 2
        });
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({ id: "u1", name: "John Doe" });
    });

    it("rejects protected issue endpoints without auth", async () => {
        const response = await request(app).get("/api/issues/projects");

        expect(response.status).toBe(401);
        expect(response.body.message).toBe("Missing or invalid Authorization header");
    });

    it("lists projects with auth", async () => {
        const response = await request(app)
            .get("/api/issues/projects?page=1&pageSize=10")
            .set("Authorization", "Bearer test-token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.total).toBe(1);
        expect(response.body.data[0]).toMatchObject({ id: "project-1", name: "Project A" });
    });

    it("creates a project with auth", async () => {
        const response = await request(app)
            .post("/api/issues/projects")
            .set("Authorization", "Bearer test-token")
            .send({
                name: "Project B",
                code: "PB",
                description: "New project",
                status: "active"
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Project created successfully");
        expect(projectModelMock.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: "Project B",
                code: "PB",
                description: "New project",
                status: "active",
                createdBy: authPayload.sub
            })
        );
    });

    it("updates a project with auth", async () => {
        const response = await request(app)
            .put("/api/issues/projects/507f1f77bcf86cd799439013")
            .set("Authorization", "Bearer test-token")
            .send({
                name: "Project A Updated",
                status: "closed"
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Project updated successfully");
    });

    it("lists time entries with auth and filters", async () => {
        const response = await request(app)
            .get("/api/issues/time-entries?activity=implementation&page=1&pageSize=10")
            .set("Authorization", "Bearer test-token");

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.total).toBe(1);
        expect(response.body.data[0]).toMatchObject({ id: "entry-1", activity: "implementation" });
        expect(timeEntryModelMock.find).toHaveBeenCalledWith(expect.objectContaining({ activity: "implementation" }));
    });

    it("creates a time entry using the authenticated user", async () => {
        const response = await request(app)
            .post("/api/issues/time-entries")
            .set("Authorization", "Bearer test-token")
            .send({
                issueId: "507f1f77bcf86cd799439012",
                date: "2026-04-19",
                hours: 2,
                activity: "implementation",
                comment: "Worked on APIs"
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe("Time entry created successfully");
        expect(timeEntryModelMock.create).toHaveBeenCalledWith(
            expect.objectContaining({
                issue: expect.any(mongoose.Types.ObjectId),
                user: authPayload.sub,
                hours: 2,
                activity: "implementation",
                comment: "Worked on APIs"
            })
        );
    });

    it("exports time entries as CSV", async () => {
        const response = await request(app)
            .get("/api/issues/time-entries/report.csv?activity=implementation")
            .set("Authorization", "Bearer test-token");

        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toContain("text/csv");
        expect(response.headers["content-disposition"]).toContain("attachment; filename=");
        expect(response.text).toContain("id,date,hours,activity,comment,issue,project,user");
        expect(response.text).toContain("implementation");
    });

    it("blocks issue creation under a closed project", async () => {
        const closedProjectId = "507f1f77bcf86cd799439015";

        projectModelMock.findById.mockReturnValueOnce(
            createQueryMock({
                id: closedProjectId,
                _id: new mongoose.Types.ObjectId(closedProjectId),
                status: "closed"
            })
        );

        const response = await request(app)
            .post("/api/issues")
            .set("Authorization", "Bearer test-token")
            .send({
                title: "Issue under closed project",
                description: "Should fail",
                status: "open",
                priority: "medium",
                projectId: closedProjectId
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Cannot create issue under a closed project");
    });

    it("blocks sub-ticket creation under a closed parent issue", async () => {
        const closedParentId = "507f1f77bcf86cd799439016";

        issueModelMock.findById.mockReturnValueOnce(
            createQueryMock({
                id: closedParentId,
                _id: new mongoose.Types.ObjectId(closedParentId),
                status: "closed"
            })
        );

        const response = await request(app)
            .post("/api/issues")
            .set("Authorization", "Bearer test-token")
            .send({
                title: "Sub issue",
                description: "Should fail",
                status: "open",
                priority: "medium",
                parentIssueId: closedParentId
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Cannot create sub-ticket under a closed parent ticket");
    });
});