import { Router } from "express";
import { authGuard } from "../../middlewares/authGuard";
import { validate } from "../../middlewares/validate";
import { logoutController, meController, signInController, signUpController } from "./auth.controller";
import { signInSchema, signUpSchema } from "./auth.validation";

const authRouter = Router();

authRouter.post("/signup", validate(signUpSchema), signUpController);
authRouter.post("/signin", validate(signInSchema), signInController);
authRouter.post("/logout", authGuard, logoutController);
authRouter.get("/me", authGuard, meController);

export { authRouter };
