/**
 * Command Processing Controller - Simplified API for Flutter client
 * Handles speech-to-text commands without authentication
 */

class CommandController {
  /**
   * Process voice command
   * POST /api/process-command
   * Body: { command: string }
   */
  static async processCommand(req, res) {
    try {
      const { command } = req.body;

      if (!command || typeof command !== 'string' || command.trim().length === 0) {
        return res.status(400).json({
          success: false,
          errorMessage: 'Command text is required',
          responseMessage: 'Please provide a valid command',
          tasks: [],
        });
      }

      // Parse the command
      const parsedTasks = await CommandController.parseCommand(command.trim());

      // Generate response message
      const responseMessage = CommandController.generateResponse(parsedTasks, command);

      res.json({
        success: true,
        responseMessage,
        tasks: parsedTasks,
        command: command.trim(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error processing command:', error);
      res.status(500).json({
        success: false,
        errorMessage: error.message,
        responseMessage: 'Failed to process your command. Please try again.',
        tasks: [],
      });
    }
  }

  /**
   * Parse command using regex patterns and NLP
   */
  static async parseCommand(text) {
    const tasks = [];
    text = text.toLowerCase();

    // Meeting/Appointment pattern
    const meetingMatch = text.match(/(?:meeting|appointment|call)\s+(?:at|with)?(.+?)(?:\s+(?:at|on|in)\s+(.+?))?(?:\s+tomorrow|\s+today|\s+tonight)?/i);
    if (meetingMatch) {
      tasks.push({
        taskType: 'meeting',
        title: 'Meeting',
        description: meetingMatch[1]?.trim() || 'Meeting',
        scheduledTime: CommandController.parseTime(text),
        priority: text.includes('urgent') ? 'high' : text.includes('casual') ? 'low' : 'normal',
      });
    }

    // Task/Todo pattern
    const taskMatch = text.match(/(?:add|create|remind|do)\s+(?:me\s+)?(.+?)(?:\s+(?:at|on|in|by)\s+(.+?))?$/i);
    if (taskMatch && !meetingMatch) {
      tasks.push({
        taskType: 'task',
        title: taskMatch[1]?.trim() || 'Task',
        description: taskMatch[1]?.trim(),
        scheduledTime: CommandController.parseTime(text),
      });
    }

    // Reminder pattern
    const reminderMatch = text.match(/(?:remind|remember)\s+(?:me\s+)?(?:to\s+)?(.+?)(?:\s+(?:at|on|in)\s+(.+?))?/i);
    if (reminderMatch && !meetingMatch && !taskMatch) {
      tasks.push({
        taskType: 'reminder',
        title: 'Reminder',
        description: reminderMatch[1]?.trim(),
        scheduledTime: CommandController.parseTime(text),
      });
    }

    // Lunch/Dinner pattern
    if (text.includes('lunch') || text.includes('dinner')) {
      tasks.push({
        taskType: 'reminder',
        title: text.includes('lunch') ? 'Lunch' : 'Dinner',
        description: text,
        scheduledTime: CommandController.parseTime(text),
      });
    }

    return tasks;
  }

  /**
   * Parse time from text
   * Examples: "5 PM", "14:30", "tomorrow at 3", "in 2 hours"
   */
  static parseTime(text) {
    text = text.toLowerCase();
    const now = new Date();
    let scheduledTime = new Date();

    // Pattern: "5 PM", "5pm", "17:30", etc.
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;

      scheduledTime.setHours(hour, minute, 0, 0);
    }

    // Adjust for "tomorrow"
    if (text.includes('tomorrow')) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // Adjust for "next"
    if (text.includes('next week')) {
      scheduledTime.setDate(scheduledTime.getDate() + 7);
    }

    return scheduledTime;
  }

  /**
   * Generate natural language response
   */
  static generateResponse(tasks, originalCommand) {
    if (tasks.length === 0) {
      return `I understood you said: "${originalCommand}". To create a task, try saying something like "Meeting at 2 PM" or "Lunch tomorrow at 12".`;
    }

    if (tasks.length === 1) {
      const task = tasks[0];
      const timeStr = task.scheduledTime
        ? new Date(task.scheduledTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'later';

      switch (task.taskType) {
        case 'meeting':
          return `Your ${task.priority === 'high' ? 'priority ' : ''}meeting "${task.description}" has been scheduled for ${timeStr}.`;
        case 'reminder':
          return `Reminder set: "${task.description}" at ${timeStr}.`;
        case 'task':
          return `Task "${task.title}" has been added to your list for ${timeStr}.`;
        default:
          return `"${task.title}" has been scheduled for ${timeStr}.`;
      }
    }

    // Multiple tasks
    const taskNames = tasks.map((t) => t.title).join(', ');
    return `I've scheduled multiple items: ${taskNames}. They're all set for you!`;
  }
}

module.exports = CommandController;
