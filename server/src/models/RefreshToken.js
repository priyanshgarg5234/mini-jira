import mongoose from 'mongoose';

/**
 * Opaque refresh tokens. Only a SHA-256 hash is stored, so a database leak
 * does not leak usable tokens. `family` groups a login session's rotation
 * chain so the whole chain can be revoked if an old token is replayed.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    createdByIp: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB removes expired tokens automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
