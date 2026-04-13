import { z } from "zod";

export const feedbackSubmissionSchema = z.object({
  // Let’s remove `z.object({ body: ... })` and go straight to the content
  visitorId: z.string().min(1, "Visitor ID is required"),
  eventId: z.string().min(1, "Event ID is required"),
  ratings: z.object({
    overall: z.number().min(1).max(5),
    content: z.number().min(1).max(5),
    speaker: z.number().min(1).max(5),
    flow: z.number().min(1).max(5),
    venue: z.number().min(1).max(5),
    interest: z.number().min(1).max(5),
  }),
  willJoinFuture: z.boolean().default(false),
  comment: z.string().min(1, "Comment is required for AI Analysis"),
});

export type FeedbackSubmissionBody = z.infer<typeof feedbackSubmissionSchema>;