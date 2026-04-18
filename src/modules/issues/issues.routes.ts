import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard";
import { validate } from "../../middlewares/validate";
import {
    createIssueController,
    deleteIssueController,
    listIssuesController,
    updateIssueController
} from "./issues.controller";
import {
    createIssueSchema,
    issueIdParamsSchema,
    listIssuesSchema,
    updateIssueSchema
} from "./issues.validation";

const issuesRouter = Router();

issuesRouter.get("/", authGuard, validate(listIssuesSchema), listIssuesController);
issuesRouter.post("/", authGuard, validate(createIssueSchema), createIssueController);
issuesRouter.put("/:id", authGuard, validate(updateIssueSchema), updateIssueController);
issuesRouter.delete("/:id", authGuard, validate(issueIdParamsSchema), deleteIssueController);

export { issuesRouter };
