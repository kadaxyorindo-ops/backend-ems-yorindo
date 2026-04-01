import { Schema, model } from 'mongoose';

const IndustrySchema = new Schema({
  name: { type: String, required: true },
  normalizedName: { type: String, unique: true } // <--- Tambahkan ini
}, { timestamps: true });

export default model('industries', IndustrySchema);