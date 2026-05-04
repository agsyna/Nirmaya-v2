import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import db from "./src/config/db";
import { clinics } from "./src/schema/clinics";
import { users } from "./src/schema/users";

const password = "password@1";

const receptionists = [
  {
    fullName: "Jaya Bansal",
    phone: "9999999999",
  },
  {
    fullName: "Dummy Receptionist",
    phone: "8888888888",
  },
];

async function main() {
  const [clinic] = await db.select().from(clinics).limit(1);

  if (!clinic) {
    throw new Error("No clinic exists. Create a clinic before creating receptionists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = [];

  for (const receptionist of receptionists) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.phone, receptionist.phone))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(users)
        .set({
          clinicId: clinic.id,
          fullName: receptionist.fullName,
          passwordHash,
          role: "receptionist",
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();

      result.push({
        status: "updated",
        id: updated.id,
        fullName: updated.fullName,
        phone: updated.phone,
        password,
        clinicId: updated.clinicId,
      });
      continue;
    }

    const [created] = await db
      .insert(users)
      .values({
        clinicId: clinic.id,
        phone: receptionist.phone,
        passwordHash,
        fullName: receptionist.fullName,
        role: "receptionist",
        isActive: true,
      })
      .returning();

    result.push({
      status: "created",
      id: created.id,
      fullName: created.fullName,
      phone: created.phone,
      password,
      clinicId: created.clinicId,
    });
  }

  console.log(JSON.stringify({ clinicId: clinic.id, users: result }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
