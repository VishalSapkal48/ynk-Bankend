import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
    });
    process.exit(1);
  }
};

export default connectDB;