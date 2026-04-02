import { Schema, model } from 'mongoose';

const CitySchema = new Schema({
  name: { type: String, required: true },
  normalizedName: { type: String, unique: true }, // <--- Tambahkan ini
  province: { type: String },
  country: { type: String, default: 'Indonesia' }
}, { timestamps: true });

export default model('cities', CitySchema);