const taskService = require('../services/taskService');
const ResponseFormatter = require('../utils/responseFormatter');

class TaskController {
  /**
   * POST /tasks - Create a new task
   */
  async createTask(req, res, next) {
    try {
      const { userId, title, date, time, frequency, source } = req.body;

      if (!userId || !title || !date) {
        return res.status(400).json(
          ResponseFormatter.error('Missing required fields: userId, title, date')
        );
      }

      const result = await taskService.createTask(userId, {
        title,
        date: new Date(date),
        time,
        frequency,
        source: source || 'app'
      });

      if (result.hasConflict) {
        return res.json(ResponseFormatter.success({
          hasConflict: true,
          conflictTask: result.conflictTask,
          message: result.message,
          requiresConfirmation: true
        }));
      }

      res.status(201).json(ResponseFormatter.success({
        task: result.task,
        message: result.message
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /tasks - Get tasks for a user
   */
  async getTasks(req, res, next) {
    try {
      const { userId, date, status } = req.query;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId query parameter is required')
        );
      }

      const filters = {};
      if (date) filters.date = new Date(date);
      if (status) filters.status = status;

      const tasks = await taskService.getTasks(userId, filters);

      res.json(ResponseFormatter.success({ tasks }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /tasks/:id - Update a task
   */
  async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const { userId, ...updateData } = req.body;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId is required')
        );
      }

      // Convert date string to Date object if present
      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }

      const task = await taskService.updateTask(id, userId, updateData);

      res.json(ResponseFormatter.success({
        task,
        message: 'Task updated successfully'
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /tasks/:id - Delete a task
   */
  async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId is required')
        );
      }

      const task = await taskService.deleteTask(id, userId);

      res.json(ResponseFormatter.success({
        message: `Task "${task.title}" deleted`,
        task
      }));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /tasks/:id - Get single task
   */
  async getTask(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId query parameter is required')
        );
      }

      const task = await taskService.findByTitle(userId, id);

      if (!task) {
        return res.status(404).json(
          ResponseFormatter.error('Task not found')
        );
      }

      res.json(ResponseFormatter.success({ task }));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();
