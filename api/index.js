require('dotenv').config();
const app = require('../src/app');
const connectDB = require('../src/config/database');

// Connect to MongoDB on cold start
let dbConnected = false;

async function ensureDBConnection() {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
      console.log('Database connected');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }
}

// Export Express app as serverless handler
module.exports = async (req, res) => {
  // Set timeout
  res.statusCode = 200;

  // CORS headers for serverless
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Ensure DB connection
    await ensureDBConnection();

    // Pass to Express
    app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    
    // Don't crash - return error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Unknown error',
        env: process.env.MONGODB_URI ? 'URI set' : 'URI missing'
      });
    }
  }
};
