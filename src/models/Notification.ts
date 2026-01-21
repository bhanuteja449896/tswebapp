import mongoose, { Schema, Document } from 'mongoose';
import { INotification, NotificationType } from '../types';

interface INotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipient: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: { type: String, ref: 'User' },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    relatedEntity: {
      type: {
        type: String,
        required: false,
      },
      id: { type: String, required: false },
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });

// TTL index to auto-delete old notifications after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Middleware to set readAt when isRead changes to true
notificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema
);
