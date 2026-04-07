const mongoose = require('mongoose');

const wakeUpSchema = new mongoose.Schema({
  time: {
    type: String,
    required: true  // HH:MM format
  },
  days: [{
    type: String,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  }],
  enabled: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const dietReminderSchema = new mongoose.Schema({
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  reminderTime: {
    type: String,
    required: true  // HH:MM format
  },
  message: {
    type: String
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

const healthSettingsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  waterInterval: {
    type: Number,  // minutes
    default: 120
  },
  lastWaterReminder: {
    type: Date
  },
  waterReminderEnabled: {
    type: Boolean,
    default: true
  },
  activityEnabled: {
    type: Boolean,
    default: false
  },
  inactivityThreshold: {
    type: Number,  // minutes
    default: 60
  },
  lastActivityUpdate: {
    type: Date
  },
  wakeUps: [wakeUpSchema],
  dietReminders: [dietReminderSchema]
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Get or create health settings
healthSettingsSchema.statics.getOrCreate = async function(userId) {
  let settings = await this.findOne({ userId });
  if (!settings) {
    settings = await this.create({ userId });
  }
  return settings;
};

const HealthSettings = mongoose.model('HealthSettings', healthSettingsSchema);

module.exports = HealthSettings;
