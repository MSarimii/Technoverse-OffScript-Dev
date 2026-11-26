import mongoose from 'mongoose';

/**
 * Connects to MongoDB via Mongoose.
 */
export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/technoverse';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('[Database] Running in development mode without active MongoDB connection.');
    }
  }
};
