import bcrypt from "bcryptjs";
import jwt, { Secret } from "jsonwebtoken";
import db from "../config/db";
import { env } from "../config/env";
import { users } from "../schema/users";
import { AppError } from "../types";
import { eq, and } from "drizzle-orm";

export const loginWithPhone = async (phone: string, password: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.phone, phone), eq(users.isActive, true)))
    .limit(1);

  if (!user) {
    throw new AppError(401, "Unauthorized", "Invalid credentials");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, "Unauthorized", "Invalid credentials");
  }

  await db
    .update(users)
    .set({ lastLogin: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, user.id), eq(users.clinicId, user.clinicId)));

  const token = jwt.sign(
    {
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
    },
    env.JWT_SECRET as Secret
  );

  return {
    token,
    user: {
      id: user.id,
      clinicId: user.clinicId,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
    },
  };
};
