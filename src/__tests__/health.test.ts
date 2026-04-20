import request from "supertest";
import type { Express } from "express";
import { beforeAll, describe, expect, it, vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.API_PREFIX = "/api";
process.env.MONGODB_URI = "mongodb://localhost:27017/issue_tracker_test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = "this-is-a-test-secret-123";
process.env.JWT_REFRESH_SECRET = "this-is-a-refresh-test-secret-123";

// eslint-disable-next-line @typescript-eslint/no-var-requires
let app: Express;

beforeAll(async () => {
    ({ app } = await import("../app.js"));
});

vi.mock("../config/redis", () => ({
    pingRedis: vi.fn().mockResolvedValue(true)
}));

describe("GET /api/health", () => {
    it("returns health payload", async () => {
        const response = await request(app).get("/api/health");

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
            service: "redmin-be",
            status: "ok"
        });
    });
});
