import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { handleSubmitFeedback } from '../controllers/FeedbackController';
import { feedbackSubmissionSchema } from '../validators/feedback.validators';

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

export default router;