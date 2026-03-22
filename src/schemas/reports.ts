import { z } from "zod";
import { UserRefSchema, PaginationQuerySchema, paginatedResponse } from "./common";

// ============================================================
// 共通パーツ
// ============================================================

/** 訪問記録のリクエスト入力 */
export const VisitRecordInputSchema = z.object({
  customer_id: z.string().uuid("顧客IDはUUID形式で指定してください"),
  visit_note: z.string().min(1, "訪問内容は必須です"),
  visit_order: z.number().int().min(1, "表示順は1以上の整数で指定してください"),
});
export type VisitRecordInput = z.infer<typeof VisitRecordInputSchema>;

/** 訪問記録のレスポンス */
export const VisitRecordResponseSchema = z.object({
  id: z.string().uuid(),
  customer: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  visit_note: z.string(),
  visit_order: z.number().int(),
});
export type VisitRecordResponse = z.infer<typeof VisitRecordResponseSchema>;

// ============================================================
// POST /reports — 日報作成
// ============================================================

export const CreateReportRequestSchema = z.object({
  report_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "報告日は YYYY-MM-DD 形式で指定してください"),
  problem: z.string().min(1, "課題・相談は必須です"),
  plan: z.string().min(1, "明日やることは必須です"),
  visit_records: z
    .array(VisitRecordInputSchema)
    .min(1, "訪問記録は1件以上必要です"),
});
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

// ============================================================
// PUT /reports/:id — 日報更新（report_date は変更不可）
// ============================================================

export const UpdateReportRequestSchema = z.object({
  problem: z.string().min(1, "課題・相談は必須です"),
  plan: z.string().min(1, "明日やることは必須です"),
  visit_records: z
    .array(VisitRecordInputSchema)
    .min(1, "訪問記録は1件以上必要です"),
});
export type UpdateReportRequest = z.infer<typeof UpdateReportRequestSchema>;

// ============================================================
// レスポンス — 日報詳細（POST/GET/PUT 共通）
// ============================================================

export const ReportDetailSchema = z.object({
  id: z.string().uuid(),
  report_date: z.string(),
  user: UserRefSchema,
  problem: z.string(),
  plan: z.string(),
  visit_records: z.array(VisitRecordResponseSchema),
  manager_comment: z.string().nullable(),
  commented_by: UserRefSchema.nullable(),
  commented_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ReportDetail = z.infer<typeof ReportDetailSchema>;

// ============================================================
// GET /reports — 日報一覧
// ============================================================

/** 一覧の各行（サマリー形式） */
export const ReportSummarySchema = z.object({
  id: z.string().uuid(),
  report_date: z.string(),
  user: UserRefSchema,
  visit_count: z.number().int().nonnegative(),
  has_comment: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type ReportSummary = z.infer<typeof ReportSummarySchema>;

/** 一覧クエリパラメータ */
export const ReportListQuerySchema = PaginationQuerySchema.extend({
  user_id: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "開始日は YYYY-MM-DD 形式で指定してください")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "終了日は YYYY-MM-DD 形式で指定してください")
    .optional(),
});
export type ReportListQuery = z.infer<typeof ReportListQuerySchema>;

/** 一覧レスポンス */
export const ReportListResponseSchema = paginatedResponse(ReportSummarySchema);
export type ReportListResponse = z.infer<typeof ReportListResponseSchema>;

// ============================================================
// PUT /reports/:id/comment — コメント登録・更新
// ============================================================

export const CommentRequestSchema = z.object({
  body: z.string().min(1, "コメント本文は必須です"),
});
export type CommentRequest = z.infer<typeof CommentRequestSchema>;

export const CommentResponseSchema = z.object({
  manager_comment: z.string(),
  commented_by: UserRefSchema,
  commented_at: z.string().datetime(),
});
export type CommentResponse = z.infer<typeof CommentResponseSchema>;
