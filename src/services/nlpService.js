const OpenAI = require('openai');
const Task = require('../models/Task');

class NLPService {
  constructor() {
    this.openai = null;
  }

  /**
   * Lazily initialize OpenAI client
   */
  getClient() {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in environment variables.');
      }
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    return this.openai;
  }

  /**
   * Process complex voice commands using OpenAI/Claude
   * Used as fallback when regex-based intent detection fails
   */
  async processComplexCommand(transcript, userId) {
    const aiProvider = process.env.AI_PROVIDER || 'openai';

    if (aiProvider === 'claude') {
      return this.processWithClaude(transcript, userId);
    }

    return this.processWithOpenAI(transcript, userId);
  }

  /**
   * Process with OpenAI GPT
   */
  async processWithOpenAI(transcript, userId) {
    try {
      // Get recent tasks for context
      const recentTasks = await Task.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title date time status');

      const tasksContext = recentTasks.length > 0
        ? `Recent tasks: ${recentTasks.map(t => `${t.title} (${t.status})`).join(', ')}`
        : 'No recent tasks';

      const systemPrompt = `You are a voice assistant for a smart wearable device. Your task is to extract structured intent and entities from voice commands.

Available intents:
- CREATE_TASK: Create a new task or reminder
- UPDATE_TASK: Modify an existing task
- DELETE_TASK: Remove a task
- GET_TASKS: List or query tasks
- HEALTH_REMINDER: Set health-related reminders (water, activity)
- WAKE_UP: Set alarm/wake-up calls
- ACTIVITY_REMINDER: Set movement/exercise reminders
- CONVERSATION: General chat or clarification

Respond with ONLY a JSON object in this format (no markdown, no explanation):
{"intent": "DETECTED_INTENT", "entities": {"title": "task name if applicable", "date": "YYYY-MM-DD if applicable", "time": "HH:MM if applicable", "frequency": "once/daily/weekly/monthly if applicable"}, "confidence": 0.0-1.0, "response": "natural language response to user if this is a conversation"}

${tasksContext}`;

      const response = await this.getClient().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const content = response.choices[0].message.content.trim();

      // Try to parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          return {
            intent: 'CONVERSATION',
            entities: { response: content },
            confidence: 0.5
          };
        }
      }

      // Parse date string to Date object if present
      if (parsed.entities && parsed.entities.date) {
        parsed.entities.date = new Date(parsed.entities.date);
      }

      return {
        intent: parsed.intent || 'CONVERSATION',
        entities: parsed.entities || {},
        confidence: parsed.confidence || 0.8,
        requiresFollowUp: false
      };
    } catch (error) {
      console.error('OpenAI processing error:', error);
      return {
        intent: 'CONVERSATION',
        entities: { response: "I'm having trouble processing that. Could you rephrase?" },
        confidence: 0
      };
    }
  }

  /**
   * Process with Claude (placeholder - implement when Claude API is configured)
   */
  async processWithClaude(transcript, userId) {
    // Placeholder for Claude implementation
    // Would use Anthropic's Claude API
    console.warn('Claude processing not implemented - falling back to OpenAI');
    return this.processWithOpenAI(transcript, userId);
  }
}

module.exports = new NLPService();
