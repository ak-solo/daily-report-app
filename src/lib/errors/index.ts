import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/middleware";

// ============================================================
// エラーコードとHTTPステータスのマッピング
// ============================================================

export const ERROR_STATUS_MAP = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  REPORT_ALREADY_EXISTS: 409,
  EMAIL_ALREADY_EXISTS: 409,
  CUSTOMER_IN_USE: 409,
  USER_IN_USE: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ============================================================
// エラーレスポンス生成
// ============================================================

/**
 * 統一エラーレスポンスを生成する。
 *
 * レスポンス形式:
 * { "error": { "code": "...", "message": "...", "details": [...] } }
 * details は省略可能
 */
export function errorResponse(
  code: keyof typeof ERROR_STATUS_MAP,
  message: string,
  details?: Array<{ field: string; message: string }>
): NextResponse {
  const status = ERROR_STATUS_MAP[code];
  const body: {
    error: {
      code: string;
      message: string;
      details?: Array<{ field: string; message: string }>;
    };
  } = {
    error: { code, message },
  };
  if (details !== undefined) {
    body.error.details = details;
  }
  return NextResponse.json(body, { status });
}

// ============================================================
// Zodエラー変換ユーティリティ
// ============================================================

/**
 * ZodError の issues を { field: string, message: string }[] に変換する。
 * field は issue.path.join(".") で結合する（例: "visit_records.0.visit_note"）
 * path が空の場合は field を "_" にする。
 */
export function formatZodError(
  error: ZodError
): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "_",
    message: issue.message,
  }));
}

// ============================================================
// AppError カスタムエラークラス
// ============================================================

/**
 * 業務エラーを throw するためのカスタムエラークラス。
 * Route Handler 内でスローし、handleError でキャッチして使う。
 */
export class AppError extends Error {
  constructor(
    public readonly code: keyof typeof ERROR_STATUS_MAP,
    message: string,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ============================================================
// Route Handler 汎用エラーキャッチヘルパー
// ============================================================

/**
 * try/catch のキャッチ節で使用する汎用エラーハンドラー。
 *
 * - AppError → errorResponse(code, message, details)
 * - AuthError → errorResponse(code, message)
 * - ZodError → errorResponse("VALIDATION_ERROR", ..., formatZodError(error))
 * - その他の Error → errorResponse("INTERNAL_SERVER_ERROR", "サーバー内部エラーが発生しました。")
 */
export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.details);
  }

  if (error instanceof AuthError) {
    return errorResponse(error.code, error.message);
  }

  if (error instanceof ZodError) {
    return errorResponse(
      "VALIDATION_ERROR",
      "入力値に誤りがあります。",
      formatZodError(error)
    );
  }

  return errorResponse(
    "INTERNAL_SERVER_ERROR",
    "サーバー内部エラーが発生しました。"
  );
}
