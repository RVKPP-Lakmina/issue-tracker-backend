import { Router } from "express";
import { listUsersController } from "./core.controller";

const coreRouter = Router();

/**
 * GET /api/core/users
 * Get all active users from cache
 */
coreRouter.get("/users", listUsersController);

export default coreRouter;
