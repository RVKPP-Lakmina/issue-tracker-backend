import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard";
import { validate } from "../../middlewares/validate";
import {
    createProjectController,
    createTimeEntryController,
    createIssueController,
    deleteIssueController,
    exportTimeEntriesCsvController,
    listProjectsController,
    listTimeEntriesController,
    listIssuesController,
    updateProjectController,
    updateIssueController
} from "./issues.controller";
import {
    createProjectSchema,
    createTimeEntrySchema,
    createIssueSchema,
    issueIdParamsSchema,
    listProjectsSchema,
    listTimeEntriesSchema,
    listIssuesSchema,
    timeEntriesReportSchema,
    updateProjectSchema,
    updateIssueSchema
} from "./issues.validation";

const issuesRouter = Router();

issuesRouter.get("/", authGuard, validate(listIssuesSchema), listIssuesController);
issuesRouter.post("/", authGuard, validate(createIssueSchema), createIssueController);
issuesRouter.put("/:id", authGuard, validate(updateIssueSchema), updateIssueController);
issuesRouter.delete("/:id", authGuard, validate(issueIdParamsSchema), deleteIssueController);

issuesRouter.get("/projects", authGuard, validate(listProjectsSchema), listProjectsController);
issuesRouter.post("/projects", authGuard, validate(createProjectSchema), createProjectController);
issuesRouter.put("/projects/:id", authGuard, validate(updateProjectSchema), updateProjectController);

issuesRouter.get("/time-entries", authGuard, validate(listTimeEntriesSchema), listTimeEntriesController);
issuesRouter.post("/time-entries", authGuard, validate(createTimeEntrySchema), createTimeEntryController);
issuesRouter.get(
    "/time-entries/report.csv",
    authGuard,
    validate(timeEntriesReportSchema),
    exportTimeEntriesCsvController
);

export { issuesRouter };
