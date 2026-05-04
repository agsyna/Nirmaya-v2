import db from "./src/config/db";
import { users } from "./src/schema/users";
import { clinics } from "./src/schema/clinics";
import { eq } from "drizzle-orm";

async function cleanup() {
  await db.delete(users).where(eq(users.phone, "+910000000000"));
  await db.delete(clinics).where(eq(clinics.phone, "+910000000000"));
  console.log("Cleanup complete");
  process.exit(0);
}

cleanup().catch(console.error);
