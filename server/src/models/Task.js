import mongoose from 'mongoose';
import { TASK_PRIORITY, TASK_STATUS } from '../config/constants.js';

const PRIORITY_RANK = { low: 1, medium: 2, high: 3 };

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 10000, default: '' },
    status: { type: String, enum: TASK_STATUS, default: 'todo' },
    priority: { type: String, enum: TASK_PRIORITY, required: true, default: 'medium' },
    priorityRank: { type: Number, default: 2, select: false },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt: { type: Date, default: null },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, default: null }, // date-only, stored at UTC midnight
  },
  { timestamps: true }
);

// Numeric mirror so "sort by priority" means High > Medium > Low, not alphabetical.
taskSchema.pre('validate', function syncPriorityRank(next) {
  this.priorityRank = PRIORITY_RANK[this.priority] ?? 2;
  next();
});

taskSchema.index({ project: 1, status: 1, updatedAt: -1 });
taskSchema.index({ assignee: 1, status: 1 });

export const Task = mongoose.model('Task', taskSchema);
