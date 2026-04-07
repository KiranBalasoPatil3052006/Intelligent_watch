const Task = require('../models/Task');

class TaskService {
  /**
   * Create a new task
   */
  async createTask(userId, taskData) {
    // Check for time conflicts
    const conflict = await Task.checkTimeConflict(userId, taskData.date, taskData.time);
    if (conflict) {
      return {
        hasConflict: true,
        conflictTask: conflict,
        message: `Another task "${conflict.title}" is already scheduled at ${taskData.time}. Do you want to replace it?`,
        requiresConfirmation: true
      };
    }

    const task = await Task.create({
      userId,
      title: taskData.title,
      date: taskData.date,
      time: taskData.time,
      frequency: taskData.frequency || 'once',
      source: taskData.source || 'voice'
    });

    return {
      hasConflict: false,
      task,
      message: `Task "${task.title}" scheduled for ${this.formatTaskDateTime(task)}`
    };
  }

  /**
   * Get tasks for a user
   */
  async getTasks(userId, filters = {}) {
    const query = { userId };

    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    if (filters.status) {
      query.status = filters.status;
    }

    return Task.find(query).sort({ date: 1, time: 1, createdAt: 1 });
  }

  /**
   * Get tasks for a specific date
   */
  async getTasksForDate(userId, date) {
    return Task.getTasksForDate(userId, date);
  }

  /**
   * Get pending tasks
   */
  async getPendingTasks(userId) {
    return Task.getPendingTasks(userId);
  }

  /**
   * Update a task
   */
  async updateTask(taskId, userId, updateData) {
    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { $set: updateData },
      { new: true }
    );

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId, userId) {
    const result = await Task.findOneAndDelete({ _id: taskId, userId });
    if (!result) {
      throw new Error('Task not found');
    }
    return result;
  }

  /**
   * Mark task as completed
   */
  async markComplete(taskId, userId) {
    return this.updateTask(taskId, userId, { status: 'completed' });
  }

  /**
   * Find task by title
   */
  async findByTitle(userId, title) {
    return Task.findOne({
      userId,
      title: { $regex: new RegExp(title, 'i') }
    });
  }

  /**
   * Format task date and time for display
   */
  formatTaskDateTime(task) {
    const dateStr = task.date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    const timeStr = task.time || 'unspecified time';
    return `${dateStr} at ${timeStr}`;
  }

  /**
   * Generate voice response for task creation
   */
  generateCreationResponse(task) {
    const dateStr = task.date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = task.time ? `at ${task.time}` : '';

    return `Your task "${task.title}" has been scheduled for ${dateStr} ${timeStr}.`;
  }

  /**
   * Generate voice response for task list
   */
  generateListResponse(tasks) {
    if (!tasks || tasks.length === 0) {
      return "You have no tasks scheduled.";
    }

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    if (pendingTasks.length === 0) {
      return "You have no pending tasks.";
    }

    let response = `You have ${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} scheduled: `;
    const taskList = pendingTasks.map(t => {
      const dateStr = t.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = t.time ? ` at ${t.time}` : '';
      return `${t.title} on ${dateStr}${timeStr}`;
    });

    response += taskList.join(', ');
    return response;
  }
}

module.exports = new TaskService();
