import mongoose, { Schema, Document } from 'mongoose';
import { IActivity, ActivityAction, ActivityTargetType } from '../types';

interface IActivityDocument extends IActivity, Document {}

const activitySchema = new Schema<IActivityDocument>(
  {
    actor: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(ActivityAction),
      required: true,
      index: true,
    },
    target: {
      type: {
        type: String,
        enum: Object.values(ActivityTargetType),
        required: true,
      },
      id: { type: String, required: true },
    },
    metadata: { type: Map, of: Schema.Types.Mixed },
    project: { type: String, ref: 'Project', index: true },
    task: { type: String, ref: 'Task', index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for common queries
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ 'target.type': 1, 'target.id': 1 });

export const Activity = mongoose.model<IActivityDocument>('Activity', activitySchema);
