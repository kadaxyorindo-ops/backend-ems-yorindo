import mongoose, { Schema, Document } from 'mongoose';

const ParticipantSchema = new Schema({
  fullName: { type: String, required: true },
  normalizedFullName: { type: String },
  personalEmail: { type: String },
  companyEmail: { type: String, required: true },
  phone: { type: String, required: true },
  
  // Referensi ke Data Master
  company: { companyId: { type: Schema.Types.ObjectId, ref: 'Company' }, name: String },
  industry: { refId: { type: Schema.Types.ObjectId, ref: 'Industry' }, name: String },
  jobTitle: { refId: { type: Schema.Types.ObjectId, ref: 'JobTitle' }, name: String },
  city: { refId: { type: Schema.Types.ObjectId, ref: 'City' }, name: String }
}, { timestamps: true });

export default mongoose.model('participants', ParticipantSchema);