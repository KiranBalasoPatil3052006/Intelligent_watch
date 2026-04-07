const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'openai',
  model: process.env.OPENAI_MODEL || 'gpt-4',
  temperature: 0.3,
  maxTokens: 200
};

module.exports = {
  openai,
  AI_CONFIG
};
