const Session = require('../models/Session');

class SessionService {
  /**
   * Get active session for user
   */
  async getSession(userId) {
    return Session.getActiveSession(userId);
  }

  /**
   * Create or update session for multi-step conversation
   */
  async createSession(userId, data) {
    const sessionExpiry = parseInt(process.env.SESSION_EXPIRY) || 30;

    return Session.upsertSession(userId, {
      partialTaskData: {
        intent: data.intent,
        entities: data.entities || {}
      },
      missingFields: data.missingFields || [],
      originalTranscript: data.originalTranscript,
      conversationStep: (data.conversationStep || 1) + 1
    });
  }

  /**
   * Update existing session with new data
   */
  async updateSession(userId, data) {
    const session = await this.getSession(userId);
    if (!session) {
      throw new Error('No active session found');
    }

    const sessionExpiry = parseInt(process.env.SESSION_EXPIRY) || 30;

    return Session.findByIdAndUpdate(
      session._id,
      {
        $set: {
          ...data,
          expiresAt: new Date(Date.now() + sessionExpiry * 60 * 1000)
        },
        $inc: { conversationStep: 1 }
      },
      { new: true }
    );
  }

  /**
   * Clear session after completion
   */
  async clearSession(userId) {
    return Session.clearSession(userId);
  }

  /**
   * Check if user has active session
   */
  async hasActiveSession(userId) {
    const session = await this.getSession(userId);
    return session !== null;
  }
}

module.exports = new SessionService();
