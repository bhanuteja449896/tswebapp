import mongoose, { Schema, Document } from 'mongoose';
import { IWorkLog } from '../types';

interface IWorkLogDocument extends IWorkLog, Document {}

const workLogSchema = new Schema<IWorkLogDocument>(
  {
    task: {
      type: String,
      ref: 'Task',
      required: true,
      index: true,
    },
    user: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Work log description is required'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    timeSpent: {
      type: Number,
      required: [true, 'Time spent is required'],
      min: [1, 'Time spent must be at least 1 minute'],
      max: [1440, 'Time spent cannot exceed 24 hours'],
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
workLogSchema.index({ task: 1, date: -1 });
workLogSchema.index({ user: 1, date: -1 });
workLogSchema.index({ task: 1, user: 1 });

export const WorkLog = mongoose.model<IWorkLogDocument>('WorkLog', workLogSchema);
