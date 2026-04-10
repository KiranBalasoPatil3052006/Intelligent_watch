const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  name: {
    type: String,
    default: 'User'
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false // Don't return password by default
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Get or create user (backwards compatible)
userSchema.statics.getOrCreate = async function(userId) {
  let user = await this.findOne({ userId });
  if (!user) {
    user = await this.create({ userId, name: 'User' });
  }
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
