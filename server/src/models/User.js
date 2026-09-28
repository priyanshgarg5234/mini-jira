import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { ROLES, ROLE_VALUES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.USER },
    // Users are never deleted: "deleting" sets isActive=false so history stays intact.
    isActive: { type: Boolean, default: true, index: true },
    deactivatedAt: { type: Date, default: null },
    // Brute-force protection
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, default: null, select: false },
    // Access tokens issued before this moment are rejected.
    passwordChangedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.failedLoginAttempts;
    delete ret.lockUntil;
    delete ret.passwordChangedAt;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
