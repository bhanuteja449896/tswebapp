import mongoose, { Schema, Document, Model } from 'mongoose';
import { IComment, IAttachment, IReaction } from '../types';

interface ICommentDocument extends IComment, Document {}

interface ICommentModel extends Model<ICommentDocument> {
  findByTask(taskId: string): Promise<ICommentDocument[]>;
  findReplies(commentId: string): Promise<ICommentDocument[]>;
}

const reactionSchema = new Schema<IReaction>(
  {
    user: { type: String, ref: 'User', required: true },
    emoji: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

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

const commentSchema = new Schema<ICommentDocument>(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    author: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    task: {
      type: String,
      ref: 'Task',
      required: true,
      index: true,
    },
    parentComment: {
      type: String,
      ref: 'Comment',
      default: null,
    },
    mentions: [{ type: String, ref: 'User' }],
    attachments: [attachmentSchema],
    reactions: [reactionSchema],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes
commentSchema.index({ task: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });

// Virtual for reply count
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
  count: true,
});

// Static methods
commentSchema.statics.findByTask = function (taskId: string) {
  return this.find({ task: taskId, parentComment: null })
    .populate('author', 'firstName lastName username avatar')
    .sort({ createdAt: -1 });
};

commentSchema.statics.findReplies = function (commentId: string) {
  return this.find({ parentComment: commentId })
    .populate('author', 'firstName lastName username avatar')
    .sort({ createdAt: 1 });
};

// Middleware to mark as edited
commentSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

export const Comment = mongoose.model<ICommentDocument, ICommentModel>('Comment', commentSchema);
