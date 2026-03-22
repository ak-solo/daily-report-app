// @vitest-environment node
import { describe, it, expect } from "vitest";
import { z, ZodError } from "zod";
import {
  ERROR_STATUS_MAP,
  errorResponse,
  formatZodError,
  AppError,
  handleError,
} from "./index";
import { AuthError } from "@/lib/auth/middleware";

// ============================================================
// errorResponse
// ============================================================

describe("errorResponse", () => {
  it("BAD_REQUEST: ステータス400を返す", async () => {
    const res = errorResponse("BAD_REQUEST", "リクエスト形式が不正です。");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "BAD_REQUEST", message: "リクエスト形式が不正です。" },
    });
  });

  it("UNAUTHORIZED: ステータス401を返す", async () => {
    const res = errorResponse("UNAUTHORIZED", "認証が必要です。");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("INVALID_CREDENTIALS: ステータス401を返す", async () => {
    const res = errorResponse(
      "INVALID_CREDENTIALS",
      "メールアドレスまたはパスワードが不正です。"
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("FORBIDDEN: ステータス403を返す", async () => {
    const res = errorResponse("FORBIDDEN", "権限がありません。");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("NOT_FOUND: ステータス404を返す", async () => {
    const res = errorResponse("NOT_FOUND", "リソースが見つかりません。");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("REPORT_ALREADY_EXISTS: ステータス409を返す", async () => {
    const res = errorResponse(
      "REPORT_ALREADY_EXISTS",
      "同一日付の日報が既に存在します。"
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("REPORT_ALREADY_EXISTS");
  });

  it("EMAIL_ALREADY_EXISTS: ステータス409を返す", async () => {
    const res = errorResponse(
      "EMAIL_ALREADY_EXISTS",
      "メールアドレスが既に使用されています。"
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("CUSTOMER_IN_USE: ステータス409を返す", async () => {
    const res = errorResponse(
      "CUSTOMER_IN_USE",
      "訪問記録に紐付いているため削除できません。"
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CUSTOMER_IN_USE");
  });

  it("USER_IN_USE: ステータス409を返す", async () => {
    const res = errorResponse(
      "USER_IN_USE",
      "日報が存在するため削除できません。"
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("USER_IN_USE");
  });

  it("VALIDATION_ERROR: ステータス422を返す", async () => {
    const res = errorResponse("VALIDATION_ERROR", "入力値に誤りがあります。");
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("INTERNAL_SERVER_ERROR: ステータス500を返す", async () => {
    const res = errorResponse(
      "INTERNAL_SERVER_ERROR",
      "サーバー内部エラーが発生しました。"
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("details なしの場合、レスポンスボディに details フィールドが含まれない", async () => {
    const res = errorResponse("NOT_FOUND", "リソースが見つかりません。");
    const body = await res.json();
    expect(body.error).not.toHaveProperty("details");
  });

  it("details ありの場合、レスポンスボディに details フィールドが含まれる", async () => {
    const details = [
      { field: "problem", message: "課題・相談は必須です。" },
      { field: "plan", message: "明日やることは必須です。" },
    ];
    const res = errorResponse(
      "VALIDATION_ERROR",
      "入力値に誤りがあります。",
      details
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.details).toEqual(details);
  });

  it("details が空配列の場合、空配列が含まれる", async () => {
    const res = errorResponse("VALIDATION_ERROR", "入力値に誤りがあります。", []);
    const body = await res.json();
    expect(body.error.details).toEqual([]);
  });
});

// ============================================================
// ERROR_STATUS_MAP
// ============================================================

describe("ERROR_STATUS_MAP", () => {
  it("全エラーコードのHTTPステータスが仕様通りである", () => {
    expect(ERROR_STATUS_MAP.BAD_REQUEST).toBe(400);
    expect(ERROR_STATUS_MAP.UNAUTHORIZED).toBe(401);
    expect(ERROR_STATUS_MAP.INVALID_CREDENTIALS).toBe(401);
    expect(ERROR_STATUS_MAP.FORBIDDEN).toBe(403);
    expect(ERROR_STATUS_MAP.NOT_FOUND).toBe(404);
    expect(ERROR_STATUS_MAP.REPORT_ALREADY_EXISTS).toBe(409);
    expect(ERROR_STATUS_MAP.EMAIL_ALREADY_EXISTS).toBe(409);
    expect(ERROR_STATUS_MAP.CUSTOMER_IN_USE).toBe(409);
    expect(ERROR_STATUS_MAP.USER_IN_USE).toBe(409);
    expect(ERROR_STATUS_MAP.VALIDATION_ERROR).toBe(422);
    expect(ERROR_STATUS_MAP.INTERNAL_SERVER_ERROR).toBe(500);
  });
});

// ============================================================
// formatZodError
// ============================================================

describe("formatZodError", () => {
  it("トップレベルフィールドのエラーを正しく変換する", () => {
    const schema = z.object({
      problem: z.string().min(1, "課題・相談は必須です。"),
    });
    const result = schema.safeParse({ problem: "" });
    expect(result.success).toBe(false);
    const formatted = formatZodError((result as { success: false; error: ZodError }).error);
    expect(formatted).toEqual([
      { field: "problem", message: "課題・相談は必須です。" },
    ]);
  });

  it("ネストされたフィールドのパスをドット記法で結合する", () => {
    const schema = z.object({
      visit_records: z.array(
        z.object({
          visit_note: z.string().min(1, "訪問内容は必須です。"),
        })
      ),
    });
    const result = schema.safeParse({
      visit_records: [{ visit_note: "" }],
    });
    expect(result.success).toBe(false);
    const formatted = formatZodError((result as { success: false; error: ZodError }).error);
    expect(formatted).toEqual([
      { field: "visit_records.0.visit_note", message: "訪問内容は必須です。" },
    ]);
  });

  it("path が空の場合、field を '_' にする", () => {
    // ZodError を手動構築して path が空のケースをテストする
    const error = new ZodError([
      {
        code: "custom",
        message: "カスタムエラー",
        path: [],
      },
    ]);
    const formatted = formatZodError(error);
    expect(formatted).toEqual([{ field: "_", message: "カスタムエラー" }]);
  });

  it("複数フィールドのエラーをすべて変換する", () => {
    const schema = z.object({
      problem: z.string().min(1, "課題は必須です。"),
      plan: z.string().min(1, "明日やることは必須です。"),
    });
    const result = schema.safeParse({ problem: "", plan: "" });
    expect(result.success).toBe(false);
    const formatted = formatZodError((result as { success: false; error: ZodError }).error);
    expect(formatted).toHaveLength(2);
    expect(formatted).toContainEqual({ field: "problem", message: "課題は必須です。" });
    expect(formatted).toContainEqual({ field: "plan", message: "明日やることは必須です。" });
  });

  it("数値インデックスを含むパスを正しくドット記法で結合する", () => {
    // Zod v4 では too_small issue は origin フィールドを使う
    const schema = z.object({
      visit_records: z.array(
        z.object({
          visit_note: z.string().min(1, "訪問内容は必須です。"),
        })
      ),
    });
    const result = schema.safeParse({
      visit_records: [{ visit_note: "" }, { visit_note: "" }, { visit_note: "" }],
    });
    expect(result.success).toBe(false);
    const formatted = formatZodError((result as { success: false; error: ZodError }).error);
    // インデックス 0, 1, 2 それぞれの visit_note エラーが含まれる
    expect(formatted).toContainEqual({
      field: "visit_records.2.visit_note",
      message: "訪問内容は必須です。",
    });
  });
});

// ============================================================
// AppError
// ============================================================

describe("AppError", () => {
  it("code と message を保持する", () => {
    const err = new AppError("NOT_FOUND", "日報が見つかりません。");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("日報が見つかりません。");
    expect(err.details).toBeUndefined();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
  });

  it("details を指定した場合に保持する", () => {
    const details = [{ field: "name", message: "名前は必須です。" }];
    const err = new AppError("VALIDATION_ERROR", "入力値に誤りがあります。", details);
    expect(err.details).toEqual(details);
  });

  it("instanceof AppError で判定できる", () => {
    const err = new AppError("FORBIDDEN", "権限がありません。");
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

// ============================================================
// handleError
// ============================================================

describe("handleError", () => {
  it("AppError を受け取り対応するエラーレスポンスを返す", async () => {
    const err = new AppError("NOT_FOUND", "日報が見つかりません。");
    const res = handleError(err);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("日報が見つかりません。");
    expect(body.error).not.toHaveProperty("details");
  });

  it("details つきの AppError を正しくハンドルする", async () => {
    const details = [{ field: "problem", message: "課題は必須です。" }];
    const err = new AppError("VALIDATION_ERROR", "入力値に誤りがあります。", details);
    const res = handleError(err);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual(details);
  });

  it("AuthError (UNAUTHORIZED) を受け取り401レスポンスを返す", async () => {
    const err = new AuthError("UNAUTHORIZED", "認証が必要です。", 401);
    const res = handleError(err);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("認証が必要です。");
  });

  it("AuthError (FORBIDDEN) を受け取り403レスポンスを返す", async () => {
    const err = new AuthError("FORBIDDEN", "この操作を実行する権限がありません。", 403);
    const res = handleError(err);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("この操作を実行する権限がありません。");
  });

  it("ZodError を受け取り422レスポンスと details を返す", async () => {
    const schema = z.object({
      problem: z.string().min(1, "課題は必須です。"),
    });
    const result = schema.safeParse({ problem: "" });
    expect(result.success).toBe(false);
    const err = (result as { success: false; error: ZodError }).error;

    const res = handleError(err);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("入力値に誤りがあります。");
    expect(body.error.details).toEqual([
      { field: "problem", message: "課題は必須です。" },
    ]);
  });

  it("不明なエラー（Error インスタンス）を受け取り500レスポンスを返す", async () => {
    const err = new Error("予期しないエラー");
    const res = handleError(err);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error.message).toBe("サーバー内部エラーが発生しました。");
  });

  it("非Errorオブジェクトを受け取り500レスポンスを返す", async () => {
    const res = handleError("文字列エラー");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("null を受け取り500レスポンスを返す", async () => {
    const res = handleError(null);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
