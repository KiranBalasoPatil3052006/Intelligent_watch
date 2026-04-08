const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Routes
const voiceRoutes = require('./routes/voiceRoutes');
const taskRoutes = require('./routes/taskRoutes');
const healthRoutes = require('./routes/healthRoutes');
const summaryRoutes = require('./routes/summaryRoutes');

// Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Intelligent Watch Backend is running', 
    version: '1.0.0',
    endpoints: {
      health: '/health',
      processVoice: '/process-voice',
      tasks: '/tasks',
      summary: '/summary',
      apiHealth: '/api/health',
      processCommand: '/api/process-command'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/process-voice', voiceRoutes);
app.use('/tasks', taskRoutes);
app.use('/health', healthRoutes);
app.use('/summary', summaryRoutes);

// NEW: Simplified process-command endpoint (no auth required)
app.post('/api/process-command', require('./controllers/commandController').processCommand);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'command-processor' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
