import { Schema, model } from 'mongoose';

const CompanySchema = new Schema({
  name: { type: String, required: true },
  normalizedName: { type: String, unique: true }, // <--- Tambahkan ini
  industry: { type: Schema.Types.ObjectId, ref: 'Industry' },
  website: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default model('companies', CompanySchema);