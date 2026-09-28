import mongoose from 'mongoose';

/** Append-only history of what happened to a task. */
const activitySchema = new mongoose.Schema(
  {
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['created', 'updated', 'commented'], required: true },
    changes: [
      {
        _id: false,
        field: String,
        from: mongoose.Schema.Types.Mixed,
        to: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Activity = mongoose.model('Activity', activitySchema);
