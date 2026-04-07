const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String  // HH:MM format (24-hour)
  },
  frequency: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly'],
    default: 'once'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed', 'cancelled'],
    default: 'pending'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    enum: ['voice', 'app', 'watch'],
    default: 'voice'
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Compound index for user-specific queries
taskSchema.index({ userId: 1, date: 1, status: 1 });

// Static to get tasks for a user on a specific date
taskSchema.statics.getTasksForDate = async function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    userId,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ time: 1, createdAt: 1 });
};

// Static to get all pending tasks
taskSchema.statics.getPendingTasks = async function(userId) {
  return this.find({
    userId,
    status: 'pending'
  }).sort({ date: 1, time: 1 });
};

// Static to check for time conflicts
taskSchema.statics.checkTimeConflict = async function(userId, date, time, excludeTaskId = null) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    userId,
    date: { $gte: startOfDay, $lte: endOfDay },
    time: time,
    status: { $ne: 'cancelled' }
  };

  if (excludeTaskId) {
    query._id = { $ne: excludeTaskId };
  }

  return this.findOne(query);
};

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
