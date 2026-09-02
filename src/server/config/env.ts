/**
 * Server Configuration & Environment Variable Access.
 * Centralized, typed, and preserves all existing fallback environment variable names.
 */

import dotenv from "dotenv";

dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  geminiApiKey: string;
  falApiKey: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
}

export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  falApiKey: process.env.FAL_API_KEY || process.env.FAL_KEY || "",
  razorpayKeyId: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
};
