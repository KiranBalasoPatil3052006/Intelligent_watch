const { INTENTS, REQUIRED_FIELDS } = require('../utils/intentPatterns');
const entityExtractor = require('../utils/entityExtractor');
const nlpService = require('./nlpService');
const sessionService = require('./sessionService');

class VoiceService {
  /**
   * Main entry point for voice processing
   */
  async processVoiceCommand(transcript, userId) {
    // Normalize transcript
    const normalizedText = transcript.toLowerCase().trim();

    // Detect intent using regex patterns
    const intentResult = this.detectIntent(normalizedText);

    // Extract entities based on detected intent
    const entities = entityExtractor.extract(normalizedText, intentResult.intent);

    // Check for missing required fields
    const missingFields = this.validateRequiredFields(intentResult.intent, entities);

    // Handle confirmation/cancellation separately
    if (intentResult.intent === 'CONFIRMATION' || intentResult.intent === 'CANCELLATION') {
      const session = await sessionService.getSession(userId);
      if (session) {
        if (intentResult.intent === 'CANCELLATION') {
          await sessionService.clearSession(userId);
          return {
            intent: 'CANCELLATION',
            message: 'Session cancelled. What else can I help you with?',
            requiresFollowUp: false
          };
        }
        // Confirmation - continue with the partial task
        return this.continueConversation(userId, 'yes');
      }
    }

    // If missing fields, ask follow-up question
    if (missingFields.length > 0 && intentResult.intent !== 'CONVERSATION') {
      await sessionService.createSession(userId, {
        intent: intentResult.intent,
        entities: entities,
        missingFields: missingFields,
        originalTranscript: transcript
      });

      return {
        requiresFollowUp: true,
        followUpQuestion: this.generateFollowUpQuestion(intentResult.intent, missingFields[0]),
        partialData: entities,
        intent: intentResult.intent
      };
    }

    // All fields present or conversation intent
    return {
      requiresFollowUp: false,
      intent: intentResult.intent,
      entities: entities,
      confidence: intentResult.confidence
    };
  }

  /**
   * Detect intent using regex patterns
   */
  detectIntent(text) {
    for (const [intent, config] of Object.entries(INTENTS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(text)) {
          return {
            intent,
            confidence: config.confidence,
            matchedPattern: config.name
          };
        }
      }
    }

    // No match - return UNKNOWN
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      matchedPattern: null
    };
  }

  /**
   * Validate required fields for intent
   */
  validateRequiredFields(intent, entities) {
    const required = REQUIRED_FIELDS[intent] || [];
    return required.filter(field => !entities[field]);
  }

  /**
   * Generate follow-up question for missing fields
   */
  generateFollowUpQuestion(intent, missingField) {
    const questions = {
      title: "What would you like to name this task?",
      date: "What date should I set it for?",
      time: "What time would you like to be reminded?",
      intervalMinutes: "How often would you like to be reminded? (e.g., every 30 minutes, every 2 hours)",
      inactivityMinutes: "How often should I remind you to move?",
      frequency: "How often should this repeat? (once, daily, weekly, monthly)"
    };

    return questions[missingField] || `Could you provide more details about the ${missingField}?`;
  }

  /**
   * Process follow-up response from user
   */
  async continueConversation(userId, followUpResponse) {
    const session = await sessionService.getSession(userId);
    if (!session) {
      throw new Error('No active session found');
    }

    // Extract new entity from follow-up
    const newEntity = entityExtractor.extract(
      followUpResponse.toLowerCase(),
      session.partialTaskData.intent
    );

    // Merge with existing partial data
    const updatedEntities = {
      ...session.partialTaskData.entities,
      ...newEntity
    };

    // Re-validate for missing fields
    const missingFields = this.validateRequiredFields(
      session.partialTaskData.intent,
      updatedEntities
    );

    if (missingFields.length > 0) {
      // Still missing fields - update session and ask again
      await sessionService.updateSession(userId, {
        partialTaskData: {
          intent: session.partialTaskData.intent,
          entities: updatedEntities
        },
        missingFields: missingFields
      });

      return {
        requiresFollowUp: true,
        followUpQuestion: this.generateFollowUpQuestion(session.partialTaskData.intent, missingFields[0]),
        partialData: updatedEntities,
        intent: session.partialTaskData.intent
      };
    }

    // All fields collected - clear session and return complete command
    await sessionService.clearSession(userId);

    return {
      requiresFollowUp: false,
      intent: session.partialTaskData.intent,
      entities: updatedEntities,
      confidence: 1.0
    };
  }

  /**
   * Process with AI when regex fails
   */
  async processWithAI(transcript, userId) {
    return nlpService.processComplexCommand(transcript, userId);
  }
}

module.exports = new VoiceService();
