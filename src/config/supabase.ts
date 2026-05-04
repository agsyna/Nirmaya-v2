import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
}

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
