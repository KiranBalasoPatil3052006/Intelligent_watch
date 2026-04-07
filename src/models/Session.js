const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  partialTaskData: {
    intent: { type: String },
    entities: {
      title: { type: String },
      date: { type: Date },
      time: { type: String },
      frequency: { type: String }
    }
  },
  missingFields: [{
    type: String
  }],
  originalTranscript: {
    type: String
  },
  conversationStep: {
    type: Number,
    default: 1
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// TTL index - sessions auto-delete after expiration
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static to get active session
sessionSchema.statics.getActiveSession = async function(userId) {
  return this.findOne({
    userId,
    expiresAt: { $gt: new Date() }
  });
};

// Static to create or update session
sessionSchema.statics.upsertSession = async function(userId, data) {
  const sessionExpiry = parseInt(process.env.SESSION_EXPIRY) || 30;

  return this.findOneAndUpdate(
    { userId },
    {
      ...data,
      expiresAt: new Date(Date.now() + sessionExpiry * 60 * 1000)
    },
    { upsert: true, new: true }
  );
};

// Static to clear session
sessionSchema.statics.clearSession = async function(userId) {
  return this.deleteOne({ userId });
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
