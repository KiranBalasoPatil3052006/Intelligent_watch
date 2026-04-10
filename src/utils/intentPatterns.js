// Intent patterns for voice command detection
const INTENTS = {
  CREATE_TASK: {
    patterns: [
      /\b(remind me|reminder|remind)\b.*\b(to|about|that|when)\b/i,
      /\b(add|create|set|schedule|create).*\b(task|meeting|appointment|event|reminder)\b/i,
      /\b(i have|i've|gott?a|gotta).*\b(meeting|task|appointment|event)\b/i,
      /\b(create|add|set|new).*\b(task|reminder|alarm)\b/i,
      /\bdon't forget\b/i,
      /\bremember to\b/i
    ],
    confidence: 0.9,
    name: 'CREATE_TASK'
  },
  UPDATE_TASK: {
    patterns: [
      /\b(update|change|modify|edit|reschedule).*\b(task|reminder|meeting|appointment)\b/i,
      /\b(mark|set).*\b(as|as being)?\s*(complete|done|pending|in progress)\b/i,
      /\b(mark|complete|done|finish)\b.*\btask\b/i,
      /\bchange the (time|date)\b/i
    ],
    confidence: 0.85,
    name: 'UPDATE_TASK'
  },
  DELETE_TASK: {
    patterns: [
      /\b(delete|remove|cancel|drop).*\b(task|reminder|meeting|appointment|event)\b/i,
      /\b(remove|delete|cancel).*\b(from my|my)\b.*\b(list|schedule)\b/i,
      /\b(no longer|don't).*\b(need|want)\b.*\b(task|reminder)\b/i
    ],
    confidence: 0.9,
    name: 'DELETE_TASK'
  },
  GET_TASKS: {
    patterns: [
      /\b(show|list|get|what|what are).*\b(tasks|meetings|reminders|appointments|schedule)\b/i,
      /\b(do i have|got).*\b(any|tasks|meetings|reminders|appointments)\b/i,
      /\b(what's|what is).*\b(my|on my).*\b(schedule|agenda|tasks)\b/i,
      /\b(tell me|read).*\b(my)?\b(tasks|schedule)\b/i,
      /\bwhat do i have\b/i
    ],
    confidence: 0.85,
    name: 'GET_TASKS'
  },
  HEALTH_REMINDER: {
    patterns: [
      /\b(water|drink|hydration|hydrate|hydro)\b.*\b(remind|interval|every|schedule)\b/i,
      /\b(remind|notify|tell).*\b(me)?.*\b(water|drink|hydrate)\b/i,
      /\b(set|create|add).*\b(water|hydration|drink).*\b(reminder|alert)\b/i,
      /\bhow much water\b/i
    ],
    confidence: 0.9,
    name: 'HEALTH_REMINDER'
  },
  WAKE_UP: {
    patterns: [
      /\b(wake|wake-up|wakeup|alarm).*\b(me|set)?\b/i,
      /\b(set|create|add).*\b(alarm|wake.?up)\b/i,
      /\b(remind|notify).*\b(to|about).*\b(waking|wake up|getting up|rise and shine)\b/i,
      /\bmorning call\b/i,
      /\bget me up\b/i
    ],
    confidence: 0.85,
    name: 'WAKE_UP'
  },
  ACTIVITY_REMINDER: {
    patterns: [
      /\b(activity|exercise|walk|move|movement|stretch|step).*\b(remind|interval|every|schedule)\b/i,
      /\b(remind|notify|tell).*\b(me)?.*\b(stand|sit|walk|move|exercise|stretch)\b/i,
      /\b(set|create|add).*\b(activity|exercise|movement).*\b(reminder|alert)\b/i,
      /\bbeen (inactive|sitting|still)\b/i
    ],
    confidence: 0.85,
    name: 'ACTIVITY_REMINDER'
  },
  CONFIRMATION: {
    patterns: [
      /\b(yes|yeah|yep|ya|sure|ok|okay|confirm|confirmed|yes please)\b/i,
      /\b(that's|that is|correct|right)\b/i,
      /\byes,? (do|go|proceed|continue)\b/i
    ],
    confidence: 0.95,
    name: 'CONFIRMATION'
  },
  CANCELLATION: {
    patterns: [
      /\b(no|nope|nah|cancel|cancelled|canceled|stop|wait|wait don't|don't)\b/i,
      /\b(never mind|nevermind|forget it|discard)\b/i
    ],
    confidence: 0.95,
    name: 'CANCELLATION'
  },
  CONVERSATION: {
    patterns: [
      /\b(hi|hello|hey|how are you|what's up|sup)\b/i,
      /\b(thanks|thank you|thx)\b/i,
      /\b(okay|ok|sure|alright)\b/i
    ],
    confidence: 0.7,
    name: 'CONVERSATION'
  }
};

// Required fields for each intent
const REQUIRED_FIELDS = {
  CREATE_TASK: ['title', 'date'],
  UPDATE_TASK: [],
  DELETE_TASK: ['title'],
  GET_TASKS: [],
  HEALTH_REMINDER: ['intervalMinutes'],
  WAKE_UP: ['time'],
  ACTIVITY_REMINDER: ['inactivityMinutes']
};

module.exports = {
  INTENTS,
  REQUIRED_FIELDS
};
