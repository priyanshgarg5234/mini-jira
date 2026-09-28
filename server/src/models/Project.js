import mongoose from 'mongoose';

/**
 * A project is staffed by whole teams and/or individual users.
 * Teams and users can belong to any number of projects.
 */
const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    key: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z][A-Z0-9]{1,9}$/ },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Counter for human-readable task keys (WEB-12)
    taskSeq: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

projectSchema.index({ teams: 1 });
projectSchema.index({ members: 1 });

export const Project = mongoose.model('Project', projectSchema);
