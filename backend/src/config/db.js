import mongoose from 'mongoose';

/**
 * Connects to MongoDB via Mongoose and fails fast if URI is missing or unreachable.
 */
export const connectDB = async (uri) => {
  const mongoUri = uri || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri || mongoUri.trim() === '') {
    throw new Error('MONGO_URI (or MONGODB_URI) is required to connect to MongoDB');
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.name}: ${error.message}`);
    throw error;
  }
};

/**
 * Cleanly closes any active Mongoose connection.
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};
