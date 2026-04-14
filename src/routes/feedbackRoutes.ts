import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  handleGetEventFeedbackAnalytics,
  handleSubmitFeedback,
} from '../controllers/FeedbackController';
import { feedbackSubmissionSchema } from '../validators/feedback.validators';
import { analyticsEventParamsSchema } from "../validators/analytic.validators.ts";

const router = Router();

/**
 * @route   POST /api/v1/feedback
 * @desc    Submit post-event feedback survey
 * @access  Private (Registered Visitor)
 */
router.post(
  '/', 
  requireAuth, 
  validate(feedbackSubmissionSchema), 
  handleSubmitFeedback
);

router.get(
  "/events/:eventId/analytics",
  requireAuth,
  requirePermission("analytics:view"),
  validate(analyticsEventParamsSchema, "params"),
  handleGetEventFeedbackAnalytics,
);

export default router;
