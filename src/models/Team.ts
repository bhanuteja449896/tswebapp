import mongoose, { Schema, Document } from 'mongoose';
import { ITeam } from '../types';

interface ITeamDocument extends ITeam, Document {}

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
  }
);

// Indexes
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

// Ensure owner is in members
teamSchema.pre('save', function (next) {
  if (!this.members.includes(this.owner)) {
    this.members.push(this.owner);
  }
  next();
});

export const Team = mongoose.model<ITeamDocument>('Team', teamSchema);
