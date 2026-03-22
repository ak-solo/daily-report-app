import { z } from "zod";
import { RoleSchema, UserRefSchema, PaginationQuerySchema, paginatedResponse } from "./common";

// ============================================================
// 共通パーツ
// ============================================================

/** ユーザーレスポンス（POST/GET/PUT 共通） */
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  manager: UserRefSchema.nullable(),
  created_at: z.string().datetime(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;

// ============================================================
// POST /users — ユーザー作成
// ============================================================

export const CreateUserRequestSchema = z.object({
  name: z
    .string()
    .min(1, "氏名は必須です")
    .max(50, "氏名は50文字以内で入力してください"),
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください"),
  role: RoleSchema,
  manager_id: z.string().uuid("上長IDはUUID形式で指定してください").optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// ============================================================
// PUT /users/:id — ユーザー更新（password は省略可）
// ============================================================

export const UpdateUserRequestSchema = CreateUserRequestSchema.extend({
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

// ============================================================
// GET /users — ユーザー一覧
// ============================================================

export const UserListQuerySchema = PaginationQuerySchema.extend({
  name: z.string().optional(),
  role: RoleSchema.optional(),
});
export type UserListQuery = z.infer<typeof UserListQuerySchema>;

export const UserListResponseSchema = paginatedResponse(UserResponseSchema);
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
