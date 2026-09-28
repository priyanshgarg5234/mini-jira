import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80, unique: true },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

teamSchema.index({ members: 1 });

teamSchema.methods.hasUser = function hasUser(userId) {
  return this.members.some((m) => String(m?._id ?? m) === String(userId));
};

export const Team = mongoose.model('Team', teamSchema);
