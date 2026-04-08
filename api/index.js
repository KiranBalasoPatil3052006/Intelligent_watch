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
      console.log('[Vercel] Database connected');
    } catch (error) {
      console.error('[Vercel] Database connection failed:', error.message);
      // Don't throw - allow API to work without DB
      dbConnected = true;
    }
  }
}

// Export Express app as serverless handler
module.exports = async (req, res) => {
  console.log(`[Vercel] ${req.method} ${req.url}`);
  
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

    // Pass to Express app
    app(req, res);
  } catch (error) {
    console.error('[Vercel] Handler error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal Server Error'
      });
    }
  }
};
