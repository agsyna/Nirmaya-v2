import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_KEY: process.env.SUPABASE_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_PHONE: process.env.TWILIO_PHONE || "",
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || "",
  GOOGLE_SERVICE_ACCOUNT_EMAIL:
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY || "",
};

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];

for (const envVar of requiredEnvVars) {
  if (!env[envVar as keyof typeof env]) {
    console.warn(`Warning: ${envVar} is not set`);
  }
}
