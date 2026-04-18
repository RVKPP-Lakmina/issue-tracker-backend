import { Router } from "express";
import mongoose from "mongoose";
import { pingRedis } from "../config/redis";
import { authRouter } from "../modules/auth/auth.routes";
import { issuesRouter } from "../modules/issues/issues.routes";
import coreRouter from "../modules/core/core.routes";

const rootRouter = Router();

rootRouter.get("/health", async (_req, res) => {
    const redis = await pingRedis();

    res.status(200).json({
        service: "redmin-be",
        status: "ok",
        timestamp: new Date().toISOString(),
        mongo: mongoose.connection.readyState === 1 ? "up" : "down",
        redis: redis ? "up" : "down"
    });
});

rootRouter.use("/auth", authRouter);
rootRouter.use("/issues", issuesRouter);
rootRouter.use("/core", coreRouter);

export { rootRouter };
