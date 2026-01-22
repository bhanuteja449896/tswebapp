import mongoose, { Schema, Document } from 'mongoose';
import { ITeam } from '../types';

interface ITeamDocument extends ITeam, Document {}

// Team schema
const teamSchema = new Schema<ITeamDocument>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    owner: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [{ type: String, ref: 'User' }],
    projects: [{ type: String, ref: 'Project' }],
    avatar: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }, // Include virtuals in toObject as well
  }
);

// Indexes for search and queries
teamSchema.index({ owner: 1 });
teamSchema.index({ members: 1 });
teamSchema.index({ name: 'text', description: 'text' });

// Virtuals
teamSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

teamSchema.virtual('projectCount').get(function () {
  return this.projects.length;
});

// Pre-save hook: ensure owner is a member
teamSchema.pre('save', function (next) {
  if (!this.members.includes(this.owner)) {
    this.members.push(this.owner);
  }
  next();
});

// Optional: Pre-update hook to enforce owner in members (for updates via findOneAndUpdate)
teamSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() as any;
  if (update.$addToSet) {
    if (!update.$addToSet.members) update.$addToSet.members = [];
    if (!update.$addToSet.members.includes(update.owner)) {
      update.$addToSet.members.push(update.owner);
    }
  }
  next();
});

export const Team = mongoose.model<ITeamDocument>('Team', teamSchema);
