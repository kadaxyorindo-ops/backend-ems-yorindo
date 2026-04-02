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
import industryRouter from "./industry.routes.ts";

const apiRouter = Router();

apiRouter.use("/events", eventRouter);
apiRouter.use("/industries", industryRouter);

// Future routers go here:
// apiRouter.use("/registrations", registrationRouter);
// apiRouter.use("/users", userRouter);

export default apiRouter;