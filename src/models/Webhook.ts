import mongoose, { Schema, Document } from 'mongoose';
import { IWebhook, WebhookEvent } from '../types';
import crypto from 'crypto';

interface IWebhookDocument extends IWebhook, Document {}

const webhookSchema = new Schema<IWebhookDocument>(
  {
    url: {
      type: String,
      required: [true, 'Webhook URL is required'],
      match: [/^https?:\/\/.+/, 'Please provide a valid URL'],
    },
    events: [
      {
        type: String,
        enum: Object.values(WebhookEvent),
        required: true,
      },
    ],
    project: {
      type: String,
      ref: 'Project',
      required: true,
      index: true,
    },
    secret: {
      type: String,
      required: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    lastTriggered: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Generate secret before saving new webhook
webhookSchema.pre('save', function (next) {
  if (this.isNew && !this.secret) {
    this.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

export const Webhook = mongoose.model<IWebhookDocument>('Webhook', webhookSchema);
