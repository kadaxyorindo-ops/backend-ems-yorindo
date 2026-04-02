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

const apiV1Router = Router();

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/communications", communicationRouter);
apiV1Router.use("/events", eventRouter);

// Future routers go here:
// apiV1Router.use("/users", userRouter);

export default apiV1Router;
