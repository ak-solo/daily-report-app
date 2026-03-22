import { z } from "zod";

// ============================================================
// ロール
// ============================================================

export const RoleSchema = z.enum(["sales", "manager", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

// ============================================================
// 共通パーツ
// ============================================================

/** ユーザー参照（id + name の軽量形式） */
export const UserRefSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});
export type UserRef = z.infer<typeof UserRefSchema>;

/** UUID パスパラメータ */
export const UuidParamSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================
// ページネーション
// ============================================================

/** 一覧系 API の共通クエリパラメータ */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** レスポンスのメタ情報 */
export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  per_page: z.number().int().min(1),
  total_pages: z.number().int().nonnegative(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/** ページネーション付きレスポンスのファクトリ */
export const paginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });

// ============================================================
// エラーレスポンス
// ============================================================

/** エラーコード一覧 */
export const ErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "INVALID_CREDENTIALS",
  "FORBIDDEN",
  "NOT_FOUND",
  "REPORT_ALREADY_EXISTS",
  "EMAIL_ALREADY_EXISTS",
  "CUSTOMER_IN_USE",
  "USER_IN_USE",
  "VALIDATION_ERROR",
  "INTERNAL_SERVER_ERROR",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/** バリデーションエラーの詳細 */
export const ErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

/** エラーレスポンス本体 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
