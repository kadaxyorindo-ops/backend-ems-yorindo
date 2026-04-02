import { Schema, model } from 'mongoose';

const JobTitleSchema = new Schema({
  name: { type: String, required: true },
  normalizedName: { type: String, unique: true } // <--- Tambahkan ini
}, { timestamps: true });

export default model('job_title', JobTitleSchema);