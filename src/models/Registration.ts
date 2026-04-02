import { Schema, model } from 'mongoose';

const RegistrationSchema = new Schema({
  eventId: { 
    type: Schema.Types.ObjectId, 
    ref: 'events', 
    required: true 
  },
  participantId: { 
    type: Schema.Types.ObjectId, 
    ref: 'participants', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'check-in'],
    default: 'pending' 
  }
}, { timestamps: true });

export default model('registrations', RegistrationSchema);