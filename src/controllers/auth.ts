import { Request, Response } from "express";
import { loginWithPhone } from "@/services/authService";
import { sendSuccess } from "@/utils/response";

export const login = async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  const result = await loginWithPhone(phone, password);
  return sendSuccess(res, result, "Login successful", 200);
};

export const verifyToken = async (req: Request, res: Response) => {
  return sendSuccess(
    res,
    { user: req.user },
    "Token verified",
    200
  );
};
