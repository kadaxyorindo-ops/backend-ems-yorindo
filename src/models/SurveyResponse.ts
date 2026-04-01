import mongoose, { Schema, Document } from 'mongoose';

const SurveyResponseSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, required: true },
  participantId: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
  answers: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

export default mongoose.model('survey_responses', SurveyResponseSchema);