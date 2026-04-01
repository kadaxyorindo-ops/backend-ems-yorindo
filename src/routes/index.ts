/**
 * @file routes/index.ts
 * @description Central API router. Mounts all feature routers under /api/v1.
 *
 * To add a new feature:
 *   1. Create src/routes/yourFeature.routes.ts
 *   2. Import it here and mount it: apiRouter.use("/your-feature", yourFeatureRouter);
 *   3. app.ts does not need to change.
 */

import { Router } from "express";
import eventRouter from "./event.routes.ts";
import formBuilderRoutes from "./formBuilder.routes.ts";
import visitorRoutes from "./visitor.routes.ts";
import {
  getAuthenticatedUser,
  requestLoginOtp,
  verifyLoginOtp,
} from "../services/auth.service.ts";

const apiRouter = Router();

apiRouter.use("/events", eventRouter);
apiRouter.use("/form-builder", formBuilderRoutes);
apiRouter.use("/visitor", visitorRoutes);

// Future routers go here:
// apiRouter.use("/registrations", registrationRouter);
// apiRouter.use("/users", userRouter);

export default apiRouter;
