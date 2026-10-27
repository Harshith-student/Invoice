import mongoose from 'mongoose';

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const DEFAULT_ATLAS_URI = 'mongodb+srv://chandanapu25bcs10263_db_user:FxH6LZ3wE1EKLeY6@cluster0.hgrktqs.mongodb.net/chasepay?retryWrites=true&w=majority';
  const uri = process.env.MONGO_URI || DEFAULT_ATLAS_URI;

  try {
    // Attempt connecting to configured MONGO_URI
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    // If running in local development and Mongo is not reachable, fall back to in-memory database
    if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
      console.log('⚠️  Remote/Local MongoDB failed at ' + uri);
      console.log('🚀 Starting built-in In-Memory MongoDB (Zero-setup development mode)...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create({ instance: { startupTimeout: 60000 } });
        const memUri = mongod.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`✅ Connected to In-Memory MongoDB: ${memUri}`);
        return conn;
      } catch (memErr) {
        console.error('❌ Failed to start in-memory MongoDB:', memErr.message);
      }
    }

    console.error('❌ MongoDB connection error:', err.message);
    throw new Error(`Database connection failed: ${err.message}`);
  }
};
