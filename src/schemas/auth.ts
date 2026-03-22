import { z } from "zod";
import { RoleSchema, UserRefSchema } from "./common";

// ============================================================
// POST /auth/login
// ============================================================

export const LoginRequestSchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(1, "パスワードは必須です"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    role: RoleSchema,
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ============================================================
// GET /auth/me
// ============================================================

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  manager: UserRefSchema.nullable(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
