import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chasepay';

  try {
    // Attempt connecting to configured MONGO_URI (2 second timeout)
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    // If running in development and local Mongo is not running, fall back to in-memory database
    if (process.env.NODE_ENV !== 'production') {
      console.log('⚠️  Local MongoDB not detected at ' + uri);
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
    console.error('💡 Tip: Either start your local MongoDB daemon, paste a free MongoDB Atlas URI into server/.env, or run with the built-in memory DB.');
    process.exit(1);
  }
};
