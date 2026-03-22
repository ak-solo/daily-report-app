import { z } from "zod";
import { UserRefSchema, PaginationQuerySchema, paginatedResponse } from "./common";

// ============================================================
// 共通パーツ
// ============================================================

/** 顧客レスポンス（POST/GET/PUT 共通） */
export const CustomerResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  industry: z.string().nullable(),
  assigned_user: UserRefSchema.nullable(),
  created_at: z.string().datetime(),
});
export type CustomerResponse = z.infer<typeof CustomerResponseSchema>;

// ============================================================
// POST /customers — 顧客作成
// PUT /customers/:id — 顧客更新（同一スキーマ）
// ============================================================

export const CustomerBodySchema = z.object({
  name: z
    .string()
    .min(1, "顧客名は必須です")
    .max(100, "顧客名は100文字以内で入力してください"),
  industry: z
    .string()
    .max(100, "業種は100文字以内で入力してください")
    .optional(),
  assigned_user_id: z.string().uuid("担当営業IDはUUID形式で指定してください").optional(),
});
export type CustomerBody = z.infer<typeof CustomerBodySchema>;

// ============================================================
// GET /customers — 顧客一覧
// ============================================================

export const CustomerListQuerySchema = PaginationQuerySchema.extend({
  name: z.string().optional(),
  assigned_user_id: z.string().uuid().optional(),
});
export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;

export const CustomerListResponseSchema = paginatedResponse(CustomerResponseSchema);
export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;
