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

      // Build response with proper structure
      const response = {
        success: true,
        message: result.followUpQuestion || `Command processed successfully`,
        data: {
          intent: result.intent,
          requiresFollowUp: result.requiresFollowUp || false,
          followUpQuestion: result.followUpQuestion,
          tasks: [],
          responseMessage: result.followUpQuestion || 'Command processed'
        }
      };

      // If no follow-up needed, execute the intent
      if (!result.requiresFollowUp) {
        try {
          const executionResult = await this.executeIntent(result.intent, result.entities, userId);
          response.message = executionResult.message;
          response.data.responseMessage = executionResult.message;
          response.data.tasks = executionResult.tasks || [];
        } catch (error) {
          console.error('Error executing intent:', error);
          response.message = 'Failed to execute command';
          response.data.responseMessage = 'Failed to execute command';
        }
      }

      return res.json(response);

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
          message: taskResult.message || 'Task created successfully',
          tasks: [taskResult.task],
          hasConflict: taskResult.hasConflict || false,
          requiresConfirmation: taskResult.requiresConfirmation || false
        };
      }

      case 'UPDATE_TASK': {
        let taskResult;
        if (entities.taskId) {
          taskResult = await taskService.updateTask(entities.taskId, userId, entities);
          return { 
            message: `Task updated`, 
            tasks: [taskResult]
          };
        } else if (entities.title) {
          const existingTask = await taskService.findByTitle(userId, entities.title);
          if (!existingTask) {
            return { 
              message: `Could not find task "${entities.title}"`,
              tasks: []
            };
          }
          taskResult = await taskService.updateTask(existingTask._id, userId, entities);
          return { 
            message: `Task "${taskResult.title}" updated`, 
            tasks: [taskResult]
          };
        }
        return { 
          message: 'Please specify which task to update',
          tasks: []
        };
      }

      case 'DELETE_TASK': {
        let taskResult;
        if (entities.taskId) {
          taskResult = await taskService.deleteTask(entities.taskId, userId);
          return { 
            message: `Task "${taskResult.title}" deleted`,
            tasks: []
          };
        } else if (entities.title) {
          const existingTask = await taskService.findByTitle(userId, entities.title);
          if (!existingTask) {
            return { 
              message: `Could not find task "${entities.title}"`,
              tasks: []
            };
          }
          taskResult = await taskService.deleteTask(existingTask._id, userId);
          return { 
            message: `Task "${taskResult.title}" deleted`,
            tasks: []
          };
        }
        return { 
          message: 'Please specify which task to delete',
          tasks: []
        };
      }

      case 'GET_TASKS': {
        const tasks = await taskService.getTasks(userId, entities);
        return {
          message: taskService.generateListResponse(tasks),
          tasks: tasks
        };
      }

      case 'HEALTH_REMINDER': {
        const settings = await healthService.setWaterReminder(userId, entities);
        return {
          message: `Water reminder set for every ${entities.intervalMinutes || settings.waterInterval} minutes`,
          tasks: []
        };
      }

      case 'WAKE_UP': {
        const settings = await healthService.setWakeUp(userId, entities);
        return {
          message: `Wake-up alarm set for ${entities.time}`,
          tasks: []
        };
      }

      case 'ACTIVITY_REMINDER': {
        const settings = await healthService.setActivityReminder(userId, entities);
        return {
          message: `Activity reminder set for every ${entities.inactivityMinutes || settings.inactivityThreshold} minutes of inactivity`,
          tasks: []
        };
      }

      case 'CONFIRMATION': {
        return { 
          message: 'Confirmed', 
          tasks: [],
          intent 
        };
      }

      case 'CANCELLATION': {
        await sessionService.clearSession(userId);
        return { 
          message: 'Cancelled', 
          tasks: [],
          intent 
        };
      }

      case 'CONVERSATION': {
        return { 
          message: entities.response || "I'm here to help!", 
          tasks: [],
          intent 
        };
      }

      default:
        return { 
          message: "I'm not sure how to help with that. Could you rephrase?",
          tasks: []
        };
    }
  }
}

module.exports = new VoiceController();
