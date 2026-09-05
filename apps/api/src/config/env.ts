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
  geminiPaygApiKey: string;
  geminiApiKeyPool: string[];
  geminiBillingTier: "free" | "pay_as_you_go" | "enterprise";
  useVertexAI: boolean;
  googleCloudProject: string;
  googleCloudLocation: string;
  falApiKey: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  databaseUrl: string;
  databaseConnectionMode: "persistent" | "serverless";
  dbDriver: "supabase" | "firebase";
}

export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiPaygApiKey: process.env.GEMINI_PAYG_API_KEY || process.env.GEMINI_PROD_API_KEY || "",
  geminiApiKeyPool: process.env.GEMINI_API_KEYS
    ? process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean)
    : [],
  geminiBillingTier: (process.env.GEMINI_BILLING_TIER as any) ||
    (process.env.GEMINI_PAYG_API_KEY || process.env.GEMINI_PROD_API_KEY || process.env.GOOGLE_GENAI_USE_VERTEXAI === "true"
      ? "pay_as_you_go"
      : process.env.NODE_ENV === "production"
      ? "pay_as_you_go"
      : "free"),
  useVertexAI: process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || process.env.GEMINI_USE_VERTEX === "true",
  googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "",
  googleCloudLocation: process.env.GOOGLE_CLOUD_LOCATION || process.env.GCP_LOCATION || "us-central1",
  falApiKey: process.env.FAL_API_KEY || process.env.FAL_KEY || "",
  razorpayKeyId: process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "",
  databaseConnectionMode: (process.env.DB_CONNECTION_MODE === "serverless" ? "serverless" : "persistent"),
  dbDriver: "supabase",
};
