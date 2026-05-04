import db from "./src/config/db";
import { users } from "./src/schema/users";
import { clinics } from "./src/schema/clinics";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function setupTestUser() {
  const phone = "+910000000000";
  const plainPassword = "TestPassword123!";
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  
  // Create a dummy clinic
  const [clinic] = await db.insert(clinics).values({
    name: "Test Clinic",
    address: "123 Test St",
    phone: "+910000000000",
  }).returning();

  // Create a dummy user
  const [user] = await db.insert(users).values({
    clinicId: clinic.id,
    phone: phone,
    passwordHash: passwordHash,
    fullName: "Test User API",
    role: "admin",
    isActive: true
  }).returning();

  console.log(JSON.stringify({ phone, password: plainPassword, clinicId: clinic.id, userId: user.id }));
  process.exit(0);
}

setupTestUser().catch(console.error);
