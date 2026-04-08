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
import authRouter from "./auth.routes.ts";
import communicationRouter from "./communication.routes.ts";
import eventRouter from "./event.routes.ts";
import userRouter from "./user.routes.ts";
import industryRouter from "./industry.routes.ts";
import formBuilderRoutes from "./formBuilder.routes.ts";
import visitorRoutes from "./visitor.routes.ts";
import analyticRoutes from "./analytic.routes.ts";
import surveyAnalyticRoutes from "./survey-analytic.routes.ts";
import {
  getAuthenticatedUser,
  requestLoginOtp,
  verifyLoginOtp,
} from "../services/auth.service.ts";

const apiV1Router = Router();

apiV1Router.use("/industries", industryRouter);
apiV1Router.use("/form-builder", formBuilderRoutes);
apiV1Router.use("/visitor", visitorRoutes);
apiV1Router.use("/auth", authRouter);
apiV1Router.use("/communications", communicationRouter);
apiV1Router.use("/events", eventRouter);
apiV1Router.use("/analytics", analyticRoutes);
apiV1Router.use("/survey-analytics", surveyAnalyticRoutes);
apiV1Router.use("/users", userRouter);

// Future routers go here:
// apiV1Router.use("/users", userRouter);

export default apiV1Router;
