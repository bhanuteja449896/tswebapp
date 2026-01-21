import mongoose, { Schema, Document } from 'mongoose';
import { ILabel } from '../types';

interface ILabelDocument extends ILabel, Document {}

const labelSchema = new Schema<ILabelDocument>(
  {
    name: {
      type: String,
      required: [true, 'Label name is required'],
      trim: true,
      maxlength: [50, 'Label name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color code'],
    },
    description: {
      type: String,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    project: {
      type: String,
      ref: 'Project',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index
labelSchema.index({ name: 1, project: 1 }, { unique: true });

export const Label = mongoose.model<ILabelDocument>('Label', labelSchema);
