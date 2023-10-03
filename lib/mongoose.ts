import mongoose from "mongoose";

let isConnected = false;

export const connectToDatabase = async () => {
  mongoose.set("strictQuery", true);

  if (!process.env.MONGODB_URI) {
    return console.log("=> no mongo uri found");
  }

  if (isConnected) {
    return console.log("=> using existing database connection");
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("=> using new database connection");
  } catch (error: any) {
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
};
