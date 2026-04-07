const voiceService = require('../services/voiceService');
const taskService = require('../services/taskService');
const healthService = require('../services/healthService');
const sessionService = require('../services/sessionService');
const ResponseFormatter = require('../utils/responseFormatter');

class VoiceController {
  /**
   * POST /process-voice
   * Main endpoint for voice command processing
   */
  async processVoice(req, res, next) {
    try {
      const { text, userId, continueSession } = req.body;

      if (!text || !userId) {
        return res.status(400).json(
          ResponseFormatter.error('Missing required fields: text and userId')
        );
      }

      let result;

      if (continueSession) {
        // Continue multi-step conversation
        result = await voiceService.continueConversation(userId, text);
      } else {
        // New voice command
        result = await voiceService.processVoiceCommand(text, userId);

        // If no intent matched and AI is enabled, try AI processing
        if (result.intent === 'UNKNOWN' && process.env.AI_ENABLED === 'true') {
          result = await voiceService.processWithAI(text, userId);
        }
      }

      // Execute the command if no follow-up needed
      if (!result.requiresFollowUp) {
        const executionResult = await this.executeIntent(result.intent, result.entities, userId);
        return res.json(ResponseFormatter.success(executionResult));
      }

      // Return follow-up question
      return res.json(ResponseFormatter.success({
        requiresFollowUp: true,
        followUpQuestion: result.followUpQuestion,
        partialData: result.partialData,
        intent: result.intent
      }));

    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute the recognized intent
   */
  async executeIntent(intent, entities, userId) {
    switch (intent) {
      case 'CREATE_TASK': {
        const taskResult = await taskService.createTask(userId, entities);
        return {
          message: taskResult.message,
          task: taskResult.task,
          hasConflict: taskResult.hasConflict || false,
          requiresConfirmation: taskResult.requiresConfirmation || false
        };
      }

      case 'UPDATE_TASK': {
        if (entities.taskId) {
          const task = await taskService.updateTask(entities.taskId, userId, entities);
          return { message: `Task updated to ${task.status}`, task };
        } else if (entities.title) {
          // Find task by title and update
          const existingTask = await taskService.findByTitle(userId, entities.title);
          if (!existingTask) {
            return { message: `Could not find task "${entities.title}"` };
          }
          const task = await taskService.updateTask(existingTask._id, userId, entities);
          return { message: `Task "${task.title}" updated`, task };
        }
        return { message: 'Please specify which task to update' };
      }

      case 'DELETE_TASK': {
        if (entities.taskId) {
          const task = await taskService.deleteTask(entities.taskId, userId);
          return { message: `Task "${task.title}" deleted` };
        } else if (entities.title) {
          const existingTask = await taskService.findByTitle(userId, entities.title);
          if (!existingTask) {
            return { message: `Could not find task "${entities.title}"` };
          }
          const task = await taskService.deleteTask(existingTask._id, userId);
          return { message: `Task "${task.title}" deleted` };
        }
        return { message: 'Please specify which task to delete' };
      }

      case 'GET_TASKS': {
        const tasks = await taskService.getTasks(userId, entities);
        return {
          tasks,
          message: taskService.generateListResponse(tasks)
        };
      }

      case 'HEALTH_REMINDER': {
        const settings = await healthService.setWaterReminder(userId, entities);
        return {
          message: `Water reminder set for every ${entities.intervalMinutes || settings.waterInterval} minutes`
        };
      }

      case 'WAKE_UP': {
        const settings = await healthService.setWakeUp(userId, entities);
        return {
          message: `Wake-up alarm set for ${entities.time}`
        };
      }

      case 'ACTIVITY_REMINDER': {
        const settings = await healthService.setActivityReminder(userId, entities);
        return {
          message: `Activity reminder set for every ${entities.inactivityMinutes || settings.inactivityThreshold} minutes of inactivity`
        };
      }

      case 'CONFIRMATION': {
        return { message: 'Confirmed', intent };
      }

      case 'CANCELLATION': {
        await sessionService.clearSession(userId);
        return { message: 'Cancelled', intent };
      }

      case 'CONVERSATION': {
        return { message: entities.response || "I'm here to help!", intent };
      }

      default:
        return { message: "I'm not sure how to help with that. Could you rephrase?" };
    }
  }
}

module.exports = new VoiceController();
