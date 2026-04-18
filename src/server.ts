import { app } from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectRedis, disconnectRedis } from "./config/redis";

let shuttingDown = false;

const startServer = async (): Promise<void> => {
    await connectDB();
    await connectRedis();

    const server = app.listen(env.PORT, () => {
        logger.info(`Server is running on port ${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
        if (shuttingDown) {
            return;
        }

        shuttingDown = true;
        logger.info(`Received ${signal}, shutting down gracefully`);

        server.close(async () => {
            await Promise.all([disconnectDB(), disconnectRedis()]);
            process.exit(0);
        });
    };

    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
};

startServer().catch((error: Error) => {
    logger.error(`Failed to start server: ${error.message}`, { stack: error.stack });
    process.exit(1);
});
