import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import { requestLogger } from "./middlewares/requestLogger";
import { rootRouter } from "./routes";

const app = express();

app.use(helmet());
app.use(
    cors({
        origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
        credentials: true
    })
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.use(env.API_PREFIX, rootRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
