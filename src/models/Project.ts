import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  IProject,
  IProjectMember,
  ProjectRole,
  ProjectStatus,
  ProjectVisibility,
  IProjectSettings,
} from '../types';

interface IProjectDocument extends IProject, Document {}

interface IProjectModel extends Model<IProjectDocument> {
  findByOwner(userId: string): Promise<IProjectDocument[]>;
  findByMember(userId: string): Promise<IProjectDocument[]>;
  generateProjectKey(name: string): Promise<string>;
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    user: { type: String, ref: 'User', required: true },
    role: {
      type: String,
      enum: Object.values(ProjectRole),
      default: ProjectRole.MEMBER,
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSettingsSchema = new Schema<IProjectSettings>(
  {
    allowExternalCollaborators: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false },
    autoAssignTasks: { type: Boolean, default: false },
    notifyMembers: { type: Boolean, default: true },
  },
  { _id: false }
);

const projectSchema = new Schema<IProjectDocument>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: [/^[A-Z]{2,10}$/, 'Project key must be 2-10 uppercase letters'],
    },
    owner: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [projectMemberSchema],
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.PLANNING,
      index: true,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    budget: { type: Number, min: 0 },
    visibility: {
      type: String,
      enum: Object.values(ProjectVisibility),
      default: ProjectVisibility.PRIVATE,
    },
    settings: {
      type: projectSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ key: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });

// Virtuals
projectSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

projectSchema.virtual('isActive').get(function () {
  return this.status === ProjectStatus.ACTIVE;
});

projectSchema.virtual('duration').get(function () {
  if (!this.startDate || !this.endDate) return null;
  const diff = this.endDate.getTime() - this.startDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)); // days
});

// Static methods
projectSchema.statics.findByOwner = function (userId: string) {
  return this.find({ owner: userId }).sort({ createdAt: -1 });
};

projectSchema.statics.findByMember = function (userId: string) {
  return this.find({ 'members.user': userId }).sort({ updatedAt: -1 });
};

projectSchema.statics.generateProjectKey = async function (name: string): Promise<string> {
  const words = name.trim().toUpperCase().split(/\s+/);
  let key = '';

  if (words.length === 1) {
    key = words[0].substring(0, 3);
  } else {
    key = words
      .slice(0, 3)
      .map((word) => word[0])
      .join('');
  }

  // Check if key exists and append number if needed
  let suffix = 1;
  let finalKey = key;
  
  while (await this.exists({ key: finalKey })) {
    finalKey = `${key}${suffix}`;
    suffix++;
  }

  return finalKey;
};

// Middleware
projectSchema.pre('save', async function (next) {
  // Ensure owner is in members list
  const ownerInMembers = this.members.some(
    (member) => member.user.toString() === this.owner.toString()
  );

  if (!ownerInMembers) {
    this.members.push({
      user: this.owner,
      role: ProjectRole.OWNER,
      joinedAt: new Date(),
    });
  }

  next();
});

// Validation for end date
projectSchema.pre('save', function (next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

export const Project = mongoose.model<IProjectDocument, IProjectModel>('Project', projectSchema);
