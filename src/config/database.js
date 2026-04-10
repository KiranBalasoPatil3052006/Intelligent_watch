const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('MongoDB already connected');
    return;
  }

  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intelligent_watch';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    // Don't throw — let the server continue without DB
    // Routes that need DB will throw their own errors
    isConnected = false;
  }
};

module.exports = connectDB;
