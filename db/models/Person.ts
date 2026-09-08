import mongoose, { Schema, Document } from 'mongoose';
import { IPerson } from '@/types';

export interface PersonDocument extends Omit<IPerson, '_id'>, Document {}

const PersonSchema = new Schema<PersonDocument>(
  {
    threadsUserId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, index: true },
    displayName: { type: String, default: '' },
    interests: [{ type: String }],
    relationship: {
      type: String,
      enum: ['STRANGER', 'ACQUAINTANCE', 'FRIENDLY', 'REGULAR'],
      default: 'STRANGER',
      index: true,
    },
    interactionCount: { type: Number, default: 0 },
    lastInteractionAt: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'people',
  }
);

export const Person = mongoose.models.Person || mongoose.model<PersonDocument>('Person', PersonSchema);

export default Person;
