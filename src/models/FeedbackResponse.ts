import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedbackResponse extends Document {
  visitorId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  ratings: {
    overall: number;
    content: number;
    speaker: number;
    flow: number;
    venue: number;
    interest: number;
  };
  willJoinFuture: boolean;
  comment: string;
  aiAnalysis: {
    sentiment: 'Positive' | 'Neutral' | 'Negative';
    score: number;
    summary: string;
  };
  submittedAt: Date;
}

const FeedbackResponseSchema: Schema = new Schema({
  visitorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  
  // Scoring Data (Scale 1-5)
  ratings: {
    overall: { type: Number, required: true, min: 1, max: 5 },
    content: { type: Number, required: true, min: 1, max: 5 },
    speaker: { type: Number, required: true, min: 1, max: 5 },
    flow: { type: Number, required: true, min: 1, max: 5 },
    venue: { type: Number, required: true, min: 1, max: 5 },
    interest: { type: Number, required: true, min: 1, max: 5 } // Buying Intent
  },

  willJoinFuture: { type: Boolean, default: false },
  comment: { type: String, trim: true },

  // --- AI Analysis Field (Capstone Requirement) ---
  aiAnalysis: {
    sentiment: { 
      type: String, 
      enum: ['Positive', 'Neutral', 'Negative'], 
      default: 'Neutral' 
    },
    score: { type: Number, default: 0 }, // Sentiment Score (e.g. 0-1)
    summary: { type: String } // AI generated summary of the comment
  },

  submittedAt: { type: Date, default: Date.now }
}, { 
  collection: 'feedback_response', 
  timestamps: true 
});

export default mongoose.model<IFeedbackResponse>('FeedbackResponse', FeedbackResponseSchema);