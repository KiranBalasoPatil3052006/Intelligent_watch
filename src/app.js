const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Routes
const voiceRoutes = require('./routes/voiceRoutes');
const taskRoutes = require('./routes/taskRoutes');
const healthRoutes = require('./routes/healthRoutes');
const summaryRoutes = require('./routes/summaryRoutes');
const authRoutes = require('./routes/authRoutes');

// Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Requested-With', 'Accept'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Intelligent Watch Backend is running',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      processVoice: '/process-voice',
      tasks: '/tasks',
      summary: '/summary',
      apiHealth: '/api/health',
      processCommand: '/api/process-command',
      authSignup: '/auth/signup',
      authLogin: '/auth/login',
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes (no auth middleware needed)
app.use('/auth', authRoutes);

// API Routes
app.use('/process-voice', voiceRoutes);
app.use('/tasks', taskRoutes);
app.use('/health', healthRoutes);
app.use('/summary', summaryRoutes);

// Simplified process-command endpoint (no auth required)
app.post('/api/process-command', require('./controllers/commandController').processCommand);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'command-processor' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint not found: ${req.method} ${req.url}`
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
