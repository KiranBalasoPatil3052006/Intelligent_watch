const Task = require('../models/Task');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, format } = require('date-fns');

class SummaryService {
  /**
   * Get daily summary for a user
   */
  async getDailySummary(userId, date) {
    const summaryDate = startOfDay(date);
    const endDate = endOfDay(date);

    // Get all tasks for the day
    const tasks = await Task.find({
      userId,
      date: { $gte: summaryDate, $lte: endDate }
    }).sort({ time: 1 });

    // Calculate statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const missedTasks = tasks.filter(t => t.status === 'missed').length;

    // Generate human-readable summary
    let summaryText = `Here's your summary for ${format(date, 'EEEE, MMMM d')}: `;

    if (totalTasks === 0) {
      summaryText = `You have no tasks scheduled for today, ${format(date, 'MMMM d')}.`;
    } else {
      if (completedTasks > 0) {
        summaryText += `You completed ${completedTasks} task${completedTasks > 1 ? 's' : ''}. `;
      }
      if (pendingTasks > 0) {
        summaryText += `${pendingTasks} task${pendingTasks > 1 ? 's are' : ' is'} still pending.`;
      }
      if (missedTasks > 0) {
        summaryText += `${missedTasks} task${missedTasks > 1 ? 's were' : ' was'} missed.`;
      }
    }

    return {
      date: format(date, 'yyyy-MM-dd'),
      tasks: tasks.map(t => ({
        id: t._id,
        title: t.title,
        time: t.time,
        status: t.status
      })),
      statistics: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        missed: missedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      summaryText
    };
  }

  /**
   * Get weekly summary for a user
   */
  async getWeeklySummary(userId) {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    // Get all tasks for the week
    const tasks = await Task.find({
      userId,
      date: { $gte: weekStart, $lte: weekEnd }
    }).sort({ date: 1, time: 1 });

    // Group tasks by day
    const tasksByDay = {};
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayKey = format(day, 'yyyy-MM-dd');
      tasksByDay[dayKey] = {
        date: format(day, 'EEEE, MMMM d'),
        tasks: [],
        completed: 0,
        total: 0
      };
    }

    // Populate tasks
    for (const task of tasks) {
      const dayKey = format(task.date, 'yyyy-MM-dd');
      if (tasksByDay[dayKey]) {
        tasksByDay[dayKey].tasks.push({
          id: task._id,
          title: task.title,
          time: task.time,
          status: task.status
        });
        tasksByDay[dayKey].total++;
        if (task.status === 'completed') {
          tasksByDay[dayKey].completed++;
        }
      }
    }

    // Calculate weekly statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;

    // Generate summary
    let summaryText = `This week's summary: ${completedTasks} of ${totalTasks} tasks completed. `;
    if (pendingTasks > 0) {
      summaryText += `${pendingTasks} task${pendingTasks > 1 ? 's are' : ' is'} still pending.`;
    }

    return {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      dailyBreakdown: Object.values(tasksByDay),
      statistics: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        mostProductiveDay: this.findMostProductiveDay(tasksByDay),
        tasksByStatus: {
          completed: completedTasks,
          pending: pendingTasks,
          missed: tasks.filter(t => t.status === 'missed').length,
          cancelled: tasks.filter(t => t.status === 'cancelled').length
        }
      },
      summaryText
    };
  }

  /**
   * Find the day with highest completion rate
   */
  findMostProductiveDay(tasksByDay) {
    let maxCompletion = 0;
    let mostProductiveDay = null;

    for (const [date, data] of Object.entries(tasksByDay)) {
      if (data.total > 0) {
        const completionRate = data.completed / data.total;
        if (completionRate > maxCompletion) {
          maxCompletion = completionRate;
          mostProductiveDay = data.date;
        }
      }
    }

    return mostProductiveDay;
  }

  /**
   * Generate end-of-day voice summary
   */
  async generateEndOfDaySummary(userId) {
    const summary = await this.getDailySummary(userId, new Date());

    let voiceText = summary.summaryText;

    // Add pending task reminders
    if (summary.statistics.pending > 0) {
      const pendingTitles = summary.tasks
        .filter(t => t.status === 'pending')
        .map(t => t.title)
        .slice(0, 3); // Limit to 3 tasks

      if (pendingTitles.length > 0) {
        voiceText += ` Your pending tasks include: ${pendingTitles.join(', ')}.`;
      }
    }

    return voiceText;
  }
}

module.exports = new SummaryService();
