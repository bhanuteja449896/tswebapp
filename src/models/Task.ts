import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  ITask,
  TaskStatus,
  TaskPriority,
  IAttachment,
} from '../types';

interface ITaskDocument extends ITask, Document {}

interface ITaskModel extends Model<ITaskDocument> {
  findByProject(projectId: string): Promise<ITaskDocument[]>;
  findByAssignee(userId: string): Promise<ITaskDocument[]>;
  findOverdue(): Promise<ITaskDocument[]>;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    uploadedBy: { type: String, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      index: true,
    },
    assignee: {
      type: String,
      ref: 'User',
      index: true,
    },
    reporter: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    project: {
      type: String,
      ref: 'Project',
      required: true,
      index: true,
    },
    tags: [{ type: String, trim: true }],
    dueDate: { type: Date, index: true },
    startDate: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    actualHours: { type: Number, min: 0, default: 0 },
    parentTask: { type: String, ref: 'Task' },
    subtasks: [{ type: String, ref: 'Task' }],
    attachments: [attachmentSchema],
    watchers: [{ type: String, ref: 'User' }],
    customFields: { type: Map, of: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for common queries
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ project: 1, assignee: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ updatedAt: -1 });

// Text index for search
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return this.dueDate < new Date() && this.status !== TaskStatus.DONE;
});

// Virtual for progress percentage
taskSchema.virtual('progress').get(function () {
  if (this.subtasks.length === 0) {
    return this.status === TaskStatus.DONE ? 100 : 0;
  }
  // This would need to be populated in a real query
  return 0;
});

// Static methods
taskSchema.statics.findByProject = function (projectId: string) {
  return this.find({ project: projectId }).populate('assignee reporter').sort({ createdAt: -1 });
};

taskSchema.statics.findByAssignee = function (userId: string) {
  return this.find({ assignee: userId })
    .populate('project')
    .sort({ priority: -1, dueDate: 1 });
};

taskSchema.statics.findOverdue = function () {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: [TaskStatus.DONE, TaskStatus.ARCHIVED] },
  })
    .populate('assignee project')
    .sort({ dueDate: 1 });
};

// Middleware to update parent task when subtask is updated
taskSchema.pre('save', async function (next) {
  if (this.isModified('status') && this.parentTask) {
    // Update parent task's subtasks status
    const Task = this.constructor as ITaskModel;
    const parent = await Task.findById(this.parentTask);
    
    if (parent) {
      // Logic to update parent status based on subtasks could go here
    }
  }
  next();
});

// Middleware to clean up subtasks when parent is deleted
taskSchema.pre('remove', async function (next) {
  if (this.subtasks && this.subtasks.length > 0) {
    await this.model('Task').deleteMany({ _id: { $in: this.subtasks } });
  }
  next();
});

export const Task = mongoose.model<ITaskDocument, ITaskModel>('Task', taskSchema);
