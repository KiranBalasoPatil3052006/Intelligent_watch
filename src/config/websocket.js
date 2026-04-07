const WebSocket = require('ws');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set of WebSocket connections
  }

  /**
   * Initialize WebSocket server
   */
  init(server) {
    this.wss = new WebSocket.Server({
      server,
      path: process.env.WS_PATH || '/ws'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('WebSocket client connected');

      // Extract userId from query string
      const url = new URL(req.url, `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId');

      if (userId) {
        this.addClient(userId, ws);
      }

      // Handle messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, userId, data);
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        if (userId) {
          this.removeClient(userId, ws);
        }
        console.log('WebSocket client disconnected');
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (userId) {
          this.removeClient(userId, ws);
        }
      });
    });

    console.log('WebSocket server initialized');
    return this.wss;
  }

  /**
   * Add client connection for a user
   */
  addClient(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
    console.log(`Client added for user ${userId}. Total connections: ${this.clients.get(userId).size}`);
  }

  /**
   * Remove client connection
   */
  removeClient(userId, ws) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(ws, userId, data) {
    switch (data.type) {
      case 'PING':
        ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
        break;

      case 'ACTIVITY_UPDATE':
        // Handle activity update from mobile app
        // This resets the inactivity monitor
        console.log(`Activity update from ${userId}`);
        break;

      case 'SUBSCRIBE':
        // Re-subscribe with different userId
        if (data.userId) {
          this.removeClient(userId, ws);
          this.addClient(data.userId, ws);
        }
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, data) {
    if (!this.clients.has(userId)) {
      console.log(`No active WebSocket connection for user ${userId}`);
      return false;
    }

    const message = JSON.stringify(data);
    let sent = false;

    for (const client of this.clients.get(userId)) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent = true;
      }
    }

    return sent;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(data) {
    const message = JSON.stringify(data);

    for (const [, clients] of this.clients) {
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
  }

  /**
   * Get number of connected users
   */
  getConnectedUsersCount() {
    return this.clients.size;
  }
}

module.exports = new WebSocketManager();
