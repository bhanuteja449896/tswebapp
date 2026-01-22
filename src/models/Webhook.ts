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
      trim: true,
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
      select: false, // hide secret by default in queries
    },
    isActive: { type: Boolean, default: true, index: true },
    lastTriggered: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate secret before saving new webhook
webhookSchema.pre('save', function (next) {
  if (this.isNew && !this.secret) {
    this.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Optional: Update lastTriggered timestamp
webhookSchema.methods.markTriggered = function () {
  this.lastTriggered = new Date();
  return this.save();
};

// Optional: Validate at least one event is selected
webhookSchema.pre('validate', function (next) {
  if (!this.events || this.events.length === 0) {
    this.invalidate('events', 'At least one webhook event must be selected');
  }
  next();
});

export const Webhook = mongoose.model<IWebhookDocument>('Webhook', webhookSchema);
