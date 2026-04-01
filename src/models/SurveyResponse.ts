import mongoose, { Schema, Document } from 'mongoose';

const SurveyResponseSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  surveyId: { type: Schema.Types.ObjectId, ref: 'Survey', default: null },
  participantId: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
  answers: { type: Schema.Types.Mixed, default: [] }
}, { timestamps: true });

SurveyResponseSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

export default mongoose.model('survey_responses', SurveyResponseSchema);
