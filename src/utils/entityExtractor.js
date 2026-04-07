const { parse, format, isValid, addDays, startOfDay } = require('date-fns');

// Date patterns
const DATE_PATTERNS = {
  today: /\b(today)\b/i,
  tomorrow: /\b(tomorrow)\b/i,
  nextWeek: /\b(next week)\b/i,
  dayAfterTomorrow: /\b(day after tomorrow)\b/i,
  specificDay: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i,
  monthDay: /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b/i,
  numericDate: /\b(\d{1,2})[\/\-](\d{1,2})(?:\[\/\-](\d{2,4}))?\b/
};

// Time patterns
const TIME_PATTERNS = {
  hourMinute: /\b(\d{1,2})\s*:?\s*(\d{2})(?:\s*(am|pm|AM|PM))?\b/,
  noonMidnight: /\b(noon|midnight|morning|afternoon|evening)\b/i,
  atTime: /\bat\s+(\d{1,2})\s*:?\s*(\d{2})?\s*(am|pm|AM|PM)?\b/i,
  inMinutes: /\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i
};

// Day name to index mapping
const DAY_MAP = {
  'sunday': 0, 'sun': 0,
  'monday': 1, 'mon': 1,
  'tuesday': 2, 'tue': 2,
  'wednesday': 3, 'wed': 3,
  'thursday': 4, 'thu': 4,
  'friday': 5, 'fri': 5,
  'saturday': 6, 'sat': 6
};

// Month name to number mapping
const MONTH_MAP = {
  'january': 0, 'jan': 0,
  'february': 1, 'feb': 1,
  'march': 2, 'mar': 2,
  'april': 3, 'apr': 3,
  'may': 4,
  'june': 5, 'jun': 5,
  'july': 6, 'jul': 6,
  'august': 7, 'aug': 7,
  'september': 8, 'sep': 8, 'sept': 8,
  'october': 9, 'oct': 9,
  'november': 10, 'nov': 10,
  'december': 11, 'dec': 11
};

/**
 * Extract date from text
 */
function extractDate(text) {
  let date = null;

  // Check for "today"
  if (DATE_PATTERNS.today.test(text)) {
    date = startOfDay(new Date());
  }
  // Check for "tomorrow"
  else if (DATE_PATTERNS.tomorrow.test(text)) {
    date = startOfDay(addDays(new Date(), 1));
  }
  // Check for "day after tomorrow"
  else if (DATE_PATTERNS.dayAfterTomorrow.test(text)) {
    date = startOfDay(addDays(new Date(), 2));
  }
  // Check for specific day name
  else {
    const dayMatch = text.match(DATE_PATTERNS.specificDay);
    if (dayMatch) {
      const dayName = dayMatch[1].toLowerCase();
      const targetDay = DAY_MAP[dayName];
      if (targetDay !== undefined) {
        date = getNextDateForDay(targetDay);
      }
    }
  }

  // Check for "month day" format (e.g., "March 15")
  const monthDayMatch = text.match(DATE_PATTERNS.monthDay);
  if (monthDayMatch && !date) {
    const monthName = monthDayMatch[1].toLowerCase().slice(0, 3);
    const day = parseInt(monthDayMatch[2]);
    const month = MONTH_MAP[monthName];
    if (month !== undefined) {
      date = new Date(new Date().getFullYear(), month, day);
      // If date is in the past, add a year
      if (date < new Date()) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
  }

  // Check for numeric date (e.g., "12/25" or "25-12-2024")
  const numericMatch = text.match(DATE_PATTERNS.numericDate);
  if (numericMatch && !date) {
    const month = parseInt(numericMatch[1]);
    const day = parseInt(numericMatch[2]);
    let year = numericMatch[3] ? parseInt(numericMatch[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    date = new Date(year, month - 1, day);
  }

  return date;
}

/**
 * Get next occurrence of a day of the week
 */
function getNextDateForDay(targetDay) {
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = targetDay - currentDay;

  // If today is the target day, check if we mean this week or next
  if (daysUntil <= 0) {
    // Check if text says "next [day]"
    daysUntil += 7;
  }

  return startOfDay(addDays(today, daysUntil));
}

/**
 * Extract time from text
 */
function extractTime(text) {
  let hours = null;
  let minutes = null;

  // Check for "at X" or "X:XX" pattern
  const atTimeMatch = text.match(/\bat\s+(\d{1,2})\s*:?\s*(\d{2})?\s*(am|pm|AM|PM)?\b/);
  if (atTimeMatch) {
    hours = parseInt(atTimeMatch[1]);
    minutes = atTimeMatch[2] ? parseInt(atTimeMatch[2]) : 0;
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
    hours = parseInt(hourPeriodMatch[1]);
    const period = hourPeriodMatch[2].toLowerCase();
    minutes = 0;

    const isPM = period === 'pm';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Check for "X:XX" pattern
  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = parseInt(timeMatch[2]);

    // Assume PM if hours < 12 and no explicit period
    if (hours < 12) {
      const hasPMIndicator = /pm/i.test(text);
      const hasAMIndicator = /am/i.test(text);
      if (!hasPMIndicator && !hasAMIndicator && hours !== 12) {
        // Default to PM for typical meeting times
      }
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Check for special times
  if (/\bnoon\b/i.test(text)) return '12:00';
  if (/\bmidnight\b/i.test(text) || /\b12\s*am\b/i.test(text)) return '00:00';
  if (/\bmorning\b/i.test(text)) return '09:00';
  if (/\bafternoon\b/i.test(text)) return '14:00';
  if (/\bevening\b/i.test(text)) return '18:00';

  return null;
}

/**
 * Extract interval in minutes
 */
function extractInterval(text) {
  const intervalMatch = text.match(/\bevery\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (intervalMatch) {
    const value = parseInt(intervalMatch[1]);
    const unit = intervalMatch[2].toLowerCase();

    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return value * 60;
    }
    return value;
  }

  // Check for "in X minutes/hours"
  const inMatch = text.match(/\bin\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (inMatch) {
    const value = parseInt(inMatch[1]);
    const unit = inMatch[2].toLowerCase();

    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return value * 60;
    }
    return value;
  }

  return null;
}

/**
 * Extract task title
 */
function extractTitle(text) {
  let title = text;

  // Remove common phrases to isolate the task
  const phrasesToRemove = [
    /\bremind me\s*/i,
    /\breminder\s*/i,
    /\babout\s*/i,
    /\bi have\s*/i,
    /\bi've got\s*/i,
    /\bi've\s*/i,
    /\bi got\s*/i,
    /\bgotta\s*/i,
    /\bgot to\s*/i,
    /\bschedule\s*/i,
    /\bcreate\s*/i,
    /\badd\s*/i,
    /\bset\s*/i,
    /\bto do\s*/i,
    /\btask\s*/i,
    /\bmeeting\s*/i,
    /\bappointment\s*/i,
    /\bevent\s*/i,
    /\bat\s+\d{1,2}\s*:?\s*\d{0,2}\s*(am|pm)?\s*/i,
    /\btomorrow\s*/i,
    /\btoday\s*/i,
    /^\s*\b\W+\s*/,
  ];

  for (const phrase of phrasesToRemove) {
    title = title.replace(phrase, '');
  }

  // Clean up whitespace
  title = title.trim().replace(/\s+/g, ' ');

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  return title || null;
}

/**
 * Extract frequency
 */
function extractFrequency(text) {
  if (/\b(daily|every day|each day)\b/i.test(text)) return 'daily';
  if (/\b(weekly|every week|each week)\b/i.test(text)) return 'weekly';
  if (/\b(monthly|every month|each month)\b/i.test(text)) return 'monthly';
  if (/\b(once|one time|single)\b/i.test(text)) return 'once';
  return 'once'; // default
}

/**
 * Extract status
 */
function extractStatus(text) {
  if (/\b(completed?|done|finish(ed)?)\b/i.test(text)) return 'completed';
  if (/\b(pending|not done|incomplete)\b/i.test(text)) return 'pending';
  if (/\b(cancelled?|canceled|removed)\b/i.test(text)) return 'cancelled';
  if (/\b(missed?|skipped)\b/i.test(text)) return 'missed';
  return null;
}

/**
 * Main extraction function
 */
function extract(text, intent) {
  const result = {};

  // Always try to extract title
  result.title = extractTitle(text);

  // Extract date and time
  result.date = extractDate(text);
  result.time = extractTime(text);

  // Extract frequency
  result.frequency = extractFrequency(text);

  // Intent-specific extraction
  switch (intent) {
    case 'UPDATE_TASK':
      result.status = extractStatus(text);
      break;
    case 'HEALTH_REMINDER':
      result.intervalMinutes = extractInterval(text);
      break;
    case 'ACTIVITY_REMINDER':
      result.inactivityMinutes = extractInterval(text);
      break;
    case 'WAKE_UP':
      result.time = result.time || extractTime(text);
      break;
  }

  return result;
}

module.exports = {
  extract,
  extractDate,
  extractTime,
  extractInterval,
  extractTitle,
  extractFrequency,
  extractStatus
};
