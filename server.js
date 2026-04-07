require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const wsManager = require('./src/config/websocket');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('Database connected successfully');

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket
    wsManager.init(server);

    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`REST API: http://localhost:${PORT}`);
      console.log(`WebSocket: ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
