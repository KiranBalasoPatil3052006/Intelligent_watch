const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: 'User'
  },
  voiceProfile: {
    enabled: { type: Boolean, default: false },
    modelPath: { type: String }
  },
  preferences: {
    defaultReminderInterval: { type: Number, default: 60 },
    waterReminderEnabled: { type: Boolean, default: true },
    activityReminderEnabled: { type: Boolean, default: true }
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Get or create user
userSchema.statics.getOrCreate = async function(userId) {
  let user = await this.findOne({ userId });
  if (!user) {
    user = await this.create({ userId });
  }
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
