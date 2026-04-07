const HealthSettings = require('../models/HealthSettings');
const WebSocketManager = require('../config/websocket');

class HealthService {
  /**
   * Set water reminder interval
   */
  async setWaterReminder(userId, data) {
    const { intervalMinutes, enabled } = data;

    const updateData = {};
    if (intervalMinutes !== undefined) updateData.waterInterval = intervalMinutes;
    if (enabled !== undefined) updateData.waterReminderEnabled = enabled;

    const settings = await HealthSettings.findOneAndUpdate(
      { userId },
      {
        $set: updateData,
        lastWaterReminder: new Date()
      },
      { upsert: true, new: true }
    );

    // Schedule recurring reminders if enabled
    if (settings.waterReminderEnabled && intervalMinutes) {
      this.scheduleWaterReminder(userId, settings.waterInterval);
    }

    return settings;
  }

  /**
   * Set activity reminder
   */
  async setActivityReminder(userId, data) {
    const { inactivityMinutes, activityType, enabled } = data;

    const settings = await HealthSettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          activityEnabled: enabled !== false,
          inactivityThreshold: inactivityMinutes || 60,
          activityType: activityType || 'movement',
          lastActivityUpdate: new Date()
        }
      },
      { upsert: true, new: true }
    );

    if (settings.activityEnabled) {
      this.startInactivityMonitor(userId, settings.inactivityThreshold);
    }

    return settings;
  }

  /**
   * Set wake-up alarm
   */
  async setWakeUp(userId, data) {
    const { time, days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] } = data;

    const settings = await HealthSettings.findOneAndUpdate(
      { userId },
      {
        $push: {
          wakeUps: {
            time,
            days,
            enabled: true,
            createdAt: new Date()
          }
        }
      },
      { upsert: true, new: true }
    );

    // Schedule the wake-up
    this.scheduleWakeUp(userId, time, days);

    return settings;
  }

  /**
   * Set diet reminder
   */
  async setDietReminder(userId, data) {
    const { mealType, reminderTime, message } = data;

    const settings = await HealthSettings.findOneAndUpdate(
      { userId },
      {
        $push: {
          dietReminders: {
            mealType,
            reminderTime,
            message: message || `Time for ${mealType}!`,
            enabled: true
          }
        }
      },
      { upsert: true, new: true }
    );

    // Schedule the diet reminder
    this.scheduleDietReminder(userId, mealType, reminderTime);

    return settings;
  }

  /**
   * Get health settings for user
   */
  async getSettings(userId) {
    return HealthSettings.getOrCreate(userId);
  }

  /**
   * Delete a wake-up alarm
   */
  async deleteWakeUp(userId, index) {
    const settings = await HealthSettings.findOneAndUpdate(
      { userId },
      {
        $unset: { [`wakeUps.${index}`]: 1 }
      },
      { new: true }
    );

    // Remove null entries
    if (settings) {
      settings.wakeUps = settings.wakeUps.filter(w => w !== null);
      await settings.save();
    }

    return settings;
  }

  /**
   * Send real-time health alert via WebSocket
   */
  async sendHealthAlert(userId, alertType, message, data = {}) {
    const alert = {
      type: 'HEALTH_ALERT',
      alertType,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    WebSocketManager.sendToUser(userId, alert);
    return alert;
  }

  /**
   * Schedule water reminder
   */
  scheduleWaterReminder(userId, intervalMinutes) {
    const intervalMs = intervalMinutes * 60 * 1000;

    // Store interval ID for cleanup if needed
    if (!this.waterIntervals) this.waterIntervals = new Map();

    // Clear existing interval for this user
    if (this.waterIntervals.has(userId)) {
      clearInterval(this.waterIntervals.get(userId));
    }

    const intervalId = setInterval(async () => {
      await this.sendHealthAlert(
        userId,
        'WATER',
        'Time to drink water! Stay hydrated.',
        { intervalMinutes }
      );
    }, intervalMs);

    this.waterIntervals.set(userId, intervalId);
  }

  /**
   * Monitor inactivity and send alerts
   */
  startInactivityMonitor(userId, thresholdMinutes) {
    const thresholdMs = thresholdMinutes * 60 * 1000;

    if (!this.activityMonitors) this.activityMonitors = new Map();

    // Clear existing monitor
    if (this.activityMonitors.has(userId)) {
      clearInterval(this.activityMonitors.get(userId));
    }

    const lastActivity = { time: Date.now() };

    // This would be triggered by app interaction in production
    const monitorId = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivity.time;
      if (timeSinceActivity >= thresholdMs) {
        await this.sendHealthAlert(
          userId,
          'INACTIVITY',
          'You have been inactive for a while. Time to move!',
          { inactiveMinutes: Math.floor(timeSinceActivity / 60000) }
        );
        lastActivity.time = Date.now(); // Reset after alert
      }
    }, 60000); // Check every minute

    this.activityMonitors.set(userId, { intervalId: monitorId, lastActivity });
  }

  /**
   * Update last activity time (called from app)
   */
  async updateActivity(userId) {
    await HealthSettings.findOneAndUpdate(
      { userId },
      { $set: { lastActivityUpdate: new Date() } }
    );

    // Reset activity monitor if exists
    if (this.activityMonitors && this.activityMonitors.has(userId)) {
      this.activityMonitors.get(userId).lastActivity.time = Date.now();
    }
  }

  /**
   * Schedule wake-up alarm
   */
  scheduleWakeUp(userId, time, days) {
    const [hours, minutes] = time.split(':').map(Number);

    if (!this.wakeUpIntervals) this.wakeUpIntervals = new Map();

    const key = `${userId}_${time}`;
    if (this.wakeUpIntervals.has(key)) {
      clearInterval(this.wakeUpIntervals.get(key));
    }

    const intervalId = setInterval(() => {
      const now = new Date();
      const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];

      if (days.includes(currentDay)) {
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        if (currentHours === hours && currentMinutes === minutes) {
          this.sendHealthAlert(
            userId,
            'WAKE_UP',
            'Good morning! Time to wake up!',
            { time }
          );
        }
      }
    }, 60000); // Check every minute

    this.wakeUpIntervals.set(key, intervalId);
  }

  /**
   * Schedule diet reminder
   */
  scheduleDietReminder(userId, mealType, time) {
    const [hours, minutes] = time.split(':').map(Number);

    if (!this.dietIntervals) this.dietIntervals = new Map();

    const key = `${userId}_${mealType}`;
    if (this.dietIntervals.has(key)) {
      clearInterval(this.dietIntervals.get(key));
    }

    const intervalId = setInterval(() => {
      const now = new Date();
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        this.sendHealthAlert(
          userId,
          'DIET',
          `Time for ${mealType}!`,
          { mealType }
        );
      }
    }, 60000);

    this.dietIntervals.set(key, intervalId);
  }
}

module.exports = new HealthService();
