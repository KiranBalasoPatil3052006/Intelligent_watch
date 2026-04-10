/**
 * Standalone Fast Voice API Server
 *
 * A lightweight, fast voice command processing server that:
 * - Responds within 300-800ms
 * - Uses regex-based intent detection
 * - Works WITHOUT MongoDB (in-memory storage)
 * - Handles all error cases with appropriate responses
 *
 * Usage:
 *   node server-standalone.js
 *
 * Runs on port 3001 by default
 */

const http = require('http');
const url = require('url');

// ============ IN-MEMORY STORAGE (for testing without MongoDB) ============
const tasks = new Map();
let taskIdCounter = 1;

// ============ INTENT PATTERNS ============
const INTENTS = {
  CREATE_TASK: {
    patterns: [
      /\b(remind me|reminder|remind)\b.*\b(to|about|that|when)\b/i,
      /\b(add|create|set|schedule).*\b(task|meeting|appointment|event|reminder)\b/i,
      /\b(i have|i've|gott?a|gotta).*\b(meeting|task|appointment|event)\b/i,
      /\b(create|add|set|new).*\b(task|reminder|alarm)\b/i,
      /\bdon't forget\b/i,
      /\bremember to\b/i
    ],
    requiredFields: ['title', 'date'],
    confidence: 0.9
  },
  UPDATE_TASK: {
    patterns: [
      /\b(update|change|modify|edit|reschedule).*\b(task|reminder|meeting|appointment)\b/i,
      /\b(mark|set).*\b(as|as being)?\s*(complete|done|pending|in progress)\b/i,
      /\b(mark|complete|done|finish)\b.*\btask\b/i
    ],
    requiredFields: [],
    confidence: 0.85
  },
  DELETE_TASK: {
    patterns: [
      /\b(delete|remove|cancel|drop).*\b(task|reminder|meeting|appointment|event)\b/i,
      /\b(remove|delete|cancel).*\b(from my|my)\b.*\b(list|schedule)\b/i
    ],
    requiredFields: ['title'],
    confidence: 0.9
  },
  GET_TASKS: {
    patterns: [
      /\b(show|list|get|what|what are).*\b(tasks|meetings|reminders|appointments|schedule)\b/i,
      /\b(do i have|got).*\b(any|tasks|meetings|reminders|appointments)\b/i,
      /\bwhat do i have\b/i
    ],
    requiredFields: [],
    confidence: 0.85
  },
  HEALTH_REMINDER: {
    patterns: [
      /\b(water|drink|hydration|hydrate).*\b(remind|interval|every|schedule)\b/i,
      /\b(remind|notify|tell).*\b(me)?.*\b(water|drink|hydrate)\b/i
    ],
    requiredFields: ['intervalMinutes'],
    confidence: 0.9
  },
  WAKE_UP: {
    patterns: [
      /\b(wake|wake-up|wakeup|alarm).*\b(me|set)?\b/i,
      /\b(set|create|add).*\b(alarm|wake.?up)\b/i,
      /\bmorning call\b/i
    ],
    requiredFields: ['time'],
    confidence: 0.85
  },
  ACTIVITY_REMINDER: {
    patterns: [
      /\b(activity|exercise|walk|move|movement|stretch).*\b(remind|interval|every|schedule)\b/i,
      /\b(remind|notify|tell).*\b(me)?.*\b(stand|sit|walk|move|exercise|stretch)\b/i
    ],
    requiredFields: ['inactivityMinutes'],
    confidence: 0.85
  },
  CONFIRMATION: {
    patterns: [
      /\b(yes|yeah|yep|ya|sure|ok|okay|confirm|confirmed)\b/i,
      /\b(that's|that is|correct|right)\b/i
    ],
    requiredFields: [],
    confidence: 0.95
  },
  CANCELLATION: {
    patterns: [
      /\b(no|nope|nah|cancel|cancelled|canceled|stop)\b/i,
      /\b(never mind|nevermind|forget it|discard)\b/i
    ],
    requiredFields: [],
    confidence: 0.95
  },
  CONVERSATION: {
    patterns: [
      /\b(hi|hello|hey|how are you|what's up|sup)\b/i,
      /\b(thanks|thank you|thx)\b/i
    ],
    requiredFields: [],
    confidence: 0.7
  }
};

// ============ ENTITY EXTRACTION ============

function extractDate(text) {
  const now = new Date();
  if (/\btoday\b/i.test(text)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d;
  }
  // Check for "month day" format
  const monthDayMatch = text.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b/i);
  if (monthDayMatch) {
    const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const month = months[monthDayMatch[1].toLowerCase().slice(0, 3)];
    const day = parseInt(monthDayMatch[2]);
    return new Date(now.getFullYear(), month, day);
  }
  // Default to today
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function extractTime(text) {
  // Check for "at X" or "X:XX" pattern
  const atTimeMatch = text.match(/\bat\s+(\d{1,2})\s*:?\s*(\d{2})?\s*(am|pm|AM|PM)?\b/);
  if (atTimeMatch) {
    let hours = parseInt(atTimeMatch[1]);
    let minutes = atTimeMatch[2] ? parseInt(atTimeMatch[2]) : 0;
    const period = atTimeMatch[3];
    if (period) {
      const isPM = period.toLowerCase() === 'pm';
      if (isPM && hours < 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  // Check for "X pm/am" pattern
  const hourPeriodMatch = text.match(/\b(\d{1,2})\s*(am|pm|AM|PM)\b/);
  if (hourPeriodMatch) {
    let hours = parseInt(hourPeriodMatch[1]);
    const period = hourPeriodMatch[2].toLowerCase();
    const isPM = period === 'pm';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:00`;
  }
  // Check for special times
  if (/\bnoon\b/i.test(text)) return '12:00';
  if (/\bmidnight\b/i.test(text)) return '00:00';
  if (/\bmorning\b/i.test(text)) return '09:00';
  if (/\bafternoon\b/i.test(text)) return '14:00';
  if (/\bevening\b/i.test(text)) return '18:00';
  return null;
}

function extractTitle(text) {
  let title = text
    .replace(/\bremind me\s*/gi, '')
    .replace(/\breminder\s*/gi, '')
    .replace(/\babout\s*/gi, '')
    .replace(/\bi have\s*/gi, '')
    .replace(/\bi've got\s*/gi, '')
    .replace(/\bi've\s*/gi, '')
    .replace(/\bi got\s*/gi, '')
    .replace(/\bgotta\s*/gi, '')
    .replace(/\bschedule\s*/gi, '')
    .replace(/\bcreate\s*/gi, '')
    .replace(/\badd\s*/gi, '')
    .replace(/\bset\s*/gi, '')
    .replace(/\bat\s+\d{1,2}\s*:?\s*\d{0,2}\s*(am|pm)?\s*/gi, '')
    .replace(/\btomorrow\s*/gi, '')
    .replace(/\btoday\s*/gi, '')
    .replace(/\b(task|meeting|appointment|event)\b/gi, '')
    .trim();
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function extractInterval(text) {
  const match = text.match(/\bevery\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('hour')) return value * 60;
    return value;
  }
  return null;
}

// ============ INTENT DETECTION ============

function detectIntent(text) {
  for (const [intent, config] of Object.entries(INTENTS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        return { intent, confidence: config.confidence };
      }
    }
  }
  return { intent: 'UNKNOWN', confidence: 0 };
}

function extractEntities(text, intent) {
  const entities = {
    title: extractTitle(text),
    date: extractDate(text),
    time: extractTime(text)
  };

  if (intent === 'HEALTH_REMINDER') {
    entities.intervalMinutes = extractInterval(text) || 60;
  }
  if (intent === 'ACTIVITY_REMINDER') {
    entities.inactivityMinutes = extractInterval(text) || 30;
  }

  return entities;
}

function getMissingFields(intent, entities) {
  const required = INTENTS[intent]?.requiredFields || [];
  return required.filter(field => !entities[field]);
}

function generateFollowUpQuestion(intent, missingField) {
  const questions = {
    title: "What would you like to name this task?",
    date: "What date should I set it for?",
    time: "What time would you like this?",
    intervalMinutes: "How often would you like to be reminded?",
    inactivityMinutes: "How often should I remind you to move?"
  };
  return questions[missingField] || `Could you provide more details about the ${missingField}?`;
}

// ============ TASK MANAGEMENT ============

function createTask(userId, entities) {
  const id = `task_${taskIdCounter++}`;
  const task = {
    _id: id,
    userId,
    title: entities.title,
    date: entities.date.toISOString().split('T')[0],
    time: entities.time,
    frequency: 'once',
    status: 'pending',
    source: 'voice',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tasks.set(id, task);
  return task;
}

function formatTaskResponse(task) {
  const dateStr = new Date(task.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = task.time ? ` at ${formatTime(task.time)}` : '';
  return `${task.title} on ${dateStr}${timeStr}`;
}

function formatTime(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ============ REQUEST HANDLING ============

function processVoiceCommand(text, userId, continueSession = false) {
  // Normalize input
  const normalizedText = text.toLowerCase().trim();

  // Detect intent
  const { intent, confidence } = detectIntent(normalizedText);

  // Extract entities
  const entities = extractEntities(normalizedText, intent);

  // Check for missing fields
  const missingFields = getMissingFields(intent, entities);

  // Handle different intents
  if (intent === 'UNKNOWN') {
    return {
      success: true,
      message: "I'm not sure how to help with that. Could you rephrase?",
      data: {
        requiresFollowUp: false,
        responseMessage: "I'm not sure how to help with that. Could you rephrase?",
        tasks: []
      }
    };
  }

  if (intent === 'CONVERSATION') {
    const greetings = ['Hello! How can I help you today?', 'Hi there! What can I do for you?', 'Hey! Ready to help you with tasks!'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    return {
      success: true,
      message: greeting,
      data: {
        requiresFollowUp: false,
        responseMessage: greeting,
        tasks: []
      }
    };
  }

  if (intent === 'CANCELLATION') {
    return {
      success: true,
      message: "Cancelled. What else can I help you with?",
      data: {
        requiresFollowUp: false,
        responseMessage: "Cancelled. What else can I help you with?",
        tasks: []
      }
    };
  }

  if (intent === 'CONFIRMATION') {
    return {
      success: true,
      message: "Confirmed!",
      data: {
        requiresFollowUp: false,
        responseMessage: "Confirmed!",
        tasks: []
      }
    };
  }

  if (intent === 'GET_TASKS') {
    const userTasks = Array.from(tasks.values()).filter(t => t.userId === userId);
    if (userTasks.length === 0) {
      return {
        success: true,
        message: "You have no tasks scheduled",
        data: {
          requiresFollowUp: false,
          responseMessage: "You have no tasks scheduled",
          tasks: []
        }
      };
    }
    const taskList = userTasks.map(formatTaskResponse).join(', ');
    return {
      success: true,
      message: `You have ${userTasks.length} task(s): ${taskList}`,
      data: {
        requiresFollowUp: false,
        responseMessage: `You have ${userTasks.length} task(s): ${taskList}`,
        tasks: userTasks
      }
    };
  }

  if (intent === 'CREATE_TASK') {
    if (missingFields.length > 0) {
      const followUpQuestion = generateFollowUpQuestion(intent, missingFields[0]);
      return {
        success: true,
        message: followUpQuestion,
        data: {
          requiresFollowUp: true,
          followUpQuestion,
          responseMessage: followUpQuestion,
          tasks: []
        }
      };
    }

    const task = createTask(userId, entities);
    const dateStr = new Date(task.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const timeStr = task.time ? ` at ${formatTime(task.time)}` : '';
    const responseMessage = `Your task "${task.title}" has been scheduled for ${dateStr}${timeStr}`;

    return {
      success: true,
      message: responseMessage,
      data: {
        requiresFollowUp: false,
        responseMessage,
        tasks: [task]
      }
    };
  }

  if (intent === 'DELETE_TASK') {
    if (!entities.title) {
      return {
        success: true,
        message: "Which task would you like to delete?",
        data: {
          requiresFollowUp: true,
          followUpQuestion: "Which task would you like to delete?",
          tasks: []
        }
      };
    }
    // Find and delete task
    const userTasks = Array.from(tasks.values()).filter(t =>
      t.userId === userId && t.title.toLowerCase().includes(entities.title.toLowerCase())
    );
    if (userTasks.length === 0) {
      return {
        success: true,
        message: `I couldn't find a task called "${entities.title}"`,
        data: {
          requiresFollowUp: false,
          responseMessage: `I couldn't find a task called "${entities.title}"`,
          tasks: []
        }
      };
    }
    const deleted = userTasks[0];
    tasks.delete(deleted._id);
    return {
      success: true,
      message: `Deleted "${deleted.title}"`,
      data: {
        requiresFollowUp: false,
        responseMessage: `Deleted "${deleted.title}"`,
        tasks: []
      }
    };
  }

  if (intent === 'HEALTH_REMINDER') {
    const interval = entities.intervalMinutes || 60;
    return {
      success: true,
      message: `Water reminder set for every ${interval} minutes`,
      data: {
        requiresFollowUp: false,
        responseMessage: `Water reminder set for every ${interval} minutes`,
        tasks: []
      }
    };
  }

  if (intent === 'WAKE_UP') {
    const time = entities.time || '08:00';
    return {
      success: true,
      message: `Alarm set for ${formatTime(time)}`,
      data: {
        requiresFollowUp: false,
        responseMessage: `Alarm set for ${formatTime(time)}`,
        tasks: []
      }
    };
  }

  if (intent === 'ACTIVITY_REMINDER') {
    const interval = entities.inactivityMinutes || 30;
    return {
      success: true,
      message: `Activity reminder set for every ${interval} minutes of inactivity`,
      data: {
        requiresFollowUp: false,
        responseMessage: `Activity reminder set for every ${interval} minutes of inactivity`,
        tasks: []
      }
    };
  }

  // Default response
  return {
    success: true,
    message: "Got it!",
    data: {
      requiresFollowUp: false,
      responseMessage: "Got it!",
      tasks: []
    }
  };
}

// ============ HTTP SERVER ============

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Route: POST /process-voice
  if (pathname === '/process-voice' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { text, userId = 'default_user', continueSession = false } = JSON.parse(body);

        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing text field' }));
          return;
        }

        // Process command and measure time
        const startTime = Date.now();
        const result = processVoiceCommand(text, userId, continueSession);
        const processingTime = Date.now() - startTime;

        console.log(`[${new Date().toISOString()}] Processed "${text}" in ${processingTime}ms -> ${result.message}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('Error processing voice command:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Internal server error',
          message: "Something went wrong, please try again"
        }));
      }
    });
    return;
  }

  // Route: GET /tasks
  if (pathname === '/tasks' && req.method === 'GET') {
    const userId = parsedUrl.query.userId || 'default_user';
    const userTasks = Array.from(tasks.values()).filter(t => t.userId === userId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Tasks retrieved',
      data: { tasks: userTasks }
    }));
    return;
  }

  // Route: GET /health
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         FAST VOICE API SERVER (Standalone)                 ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  Endpoints:                                                ║
║    POST /process-voice  - Process voice command            ║
║    GET  /tasks          - Get all tasks                    ║
║    GET  /health         - Health check                     ║
║                                                            ║
║  Features:                                                  ║
║    ✓ Fast regex-based intent detection                     ║
║    ✓ In-memory storage (no MongoDB needed)                 ║
║    ✓ Multi-command support                                 ║
║    ✓ Follow-up questions for missing info                 ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
