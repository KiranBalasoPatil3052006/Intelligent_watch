const summaryService = require('../services/summaryService');
const ResponseFormatter = require('../utils/responseFormatter');

class SummaryController {
  /**
   * GET /summary - Get daily summary
   */
  async getSummary(req, res, next) {
    try {
      const { userId, date } = req.query;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId query parameter is required')
        );
      }

      const summaryDate = date ? new Date(date) : new Date();
      const summary = await summaryService.getDailySummary(userId, summaryDate);

      res.json(ResponseFormatter.success(summary));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /summary/week - Get weekly summary
   */
  async getWeeklySummary(req, res, next) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json(
          ResponseFormatter.error('userId query parameter is required')
        );
      }

      const summary = await summaryService.getWeeklySummary(userId);

      res.json(ResponseFormatter.success(summary));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SummaryController();
