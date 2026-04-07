const healthService = require('../services/healthService');
const ResponseFormatter = require('../utils/responseFormatter');

class HealthController {
  /**
   * POST /health/water - Set water reminder
   */
  async setWaterReminder(req, res, next) {
    try {
      const { userId, intervalMinutes, enabled } = req.body;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId is required')
        );
      }

      if (intervalMinutes !== undefined && intervalMinutes < 15) {
        return res.status(400).json(
          ResponseFormatter.error('Water interval must be at least 15 minutes')
        );
      }

      const settings = await healthService.setWaterReminder(userId, {
        intervalMinutes,
        enabled
      });

      res.json(ResponseFormatter.success({
        settings,
        message: `Water reminder ${enabled === false ? 'disabled' : `set for every ${settings.waterInterval} minutes`}`
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /health/activity - Set activity reminder
   */
  async setActivityReminder(req, res, next) {
    try {
      const { userId, inactivityMinutes, activityType, enabled } = req.body;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId is required')
        );
      }

      const settings = await healthService.setActivityReminder(userId, {
        inactivityMinutes: inactivityMinutes || 60,
        activityType: activityType || 'movement',
        enabled: enabled !== false
      });

      res.json(ResponseFormatter.success({
        settings,
        message: `Activity reminder ${enabled === false ? 'disabled' : `set for every ${settings.inactivityThreshold} minutes of inactivity`}`
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /health/wakeup - Set wake-up alarm
   */
  async setWakeUp(req, res, next) {
    try {
      const { userId, time, days } = req.body;

      if (!userId || !time) {
        return res.status(400).json(
          ResponseFormatter.error('userId and time are required')
        );
      }

      // Validate time format
      if (!/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json(
          ResponseFormatter.error('Invalid time format. Use HH:MM (24-hour format)')
        );
      }

      const settings = await healthService.setWakeUp(userId, { time, days });

      res.status(201).json(ResponseFormatter.success({
        settings,
        message: `Wake-up alarm set for ${time}`
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /health/diet - Set diet reminder
   */
  async setDietReminder(req, res, next) {
    try {
      const { userId, mealType, reminderTime, message } = req.body;

      if (!userId || !mealType || !reminderTime) {
        return res.status(400).json(
          ResponseFormatter.error('userId, mealType, and reminderTime are required')
        );
      }

      const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      if (!validMealTypes.includes(mealType.toLowerCase())) {
        return res.status(400).json(
          ResponseFormatter.error(`Invalid mealType. Must be one of: ${validMealTypes.join(', ')}`)
        );
      }

      const settings = await healthService.setDietReminder(userId, {
        mealType: mealType.toLowerCase(),
        reminderTime,
        message
      });

      res.status(201).json(ResponseFormatter.success({
        settings,
        message: `Diet reminder set for ${mealType}`
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /health/settings - Get health settings
   */
  async getSettings(req, res, next) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId is required')
        );
      }

      const settings = await healthService.getSettings(userId);

      res.json(ResponseFormatter.success({ settings }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /health/wakeup/:index - Delete a wake-up alarm
   */
  async deleteWakeUp(req, res, next) {
    try {
      const { userId } = req.body;
      const { index } = req.params;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId is required')
        );
      }

      const settings = await healthService.deleteWakeUp(userId, parseInt(index));

      res.json(ResponseFormatter.success({
        settings,
        message: 'Wake-up alarm deleted'
      }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
