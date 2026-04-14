/**
 * @file routes/index.ts
 * @description Central API v1 router. Mounts all versioned feature routers.
 *
 * To add a new feature:
 *   1. Create src/routes/yourFeature.routes.ts
 *   2. Import it here and mount it: apiRouter.use("/your-feature", yourFeatureRouter);
 *   3. app.ts does not need to change.
 */

import { Router } from "express";
import authRouter from "./auth.routes";
import communicationRouter from "./communication.routes";
import eventRouter from "./event.routes";
import userRouter from "./user.routes";
import feedbackRouter from "./feedbackRoutes";
import industryRouter from "./industry.routes";
import formBuilderRoutes from "./formBuilder.routes";
import visitorRoutes from "./visitor.routes";
import surveyRouter from "./survey.routes";
import analyticsRouter from "./analytics.routes";
import surveyAnalyticRoutes from "./survey-analytic.routes";
import {
  getAuthenticatedUser,
  requestLoginOtp,
  verifyLoginOtp,
} from "../services/auth.service";

const apiV1Router = Router();

apiV1Router.use("/industries", industryRouter);
apiV1Router.use("/form-builder", formBuilderRoutes);
apiV1Router.use("/visitor", visitorRoutes);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/communications", communicationRouter);
apiV1Router.use("/events", eventRouter);
apiV1Router.use("/analytics", analyticsRouter);
apiV1Router.use("/survey-analytics", surveyAnalyticRoutes);
apiV1Router.use("/users", userRouter);
apiV1Router.use("/feedback", feedbackRouter);
apiV1Router.use("/surveys", surveyRouter);

export default apiV1Router;
