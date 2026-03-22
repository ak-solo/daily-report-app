import { describe, it, expect } from "vitest";
import {
  RoleSchema,
  UserRefSchema,
  PaginationQuerySchema,
  PaginationMetaSchema,
  paginatedResponse,
  ErrorCodeSchema,
  ErrorDetailSchema,
  ErrorResponseSchema,
} from "./common";
import { z } from "zod";

describe("RoleSchema", () => {
  it("有効なロールを受け入れる", () => {
    expect(RoleSchema.parse("sales")).toBe("sales");
    expect(RoleSchema.parse("manager")).toBe("manager");
    expect(RoleSchema.parse("admin")).toBe("admin");
  });

  it("無効なロールを拒否する", () => {
    expect(() => RoleSchema.parse("superuser")).toThrow();
    expect(() => RoleSchema.parse("")).toThrow();
  });
});

describe("UserRefSchema", () => {
  it("正しい形式を受け入れる", () => {
    const result = UserRefSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "山田 太郎",
    });
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.name).toBe("山田 太郎");
  });

  it("UUID形式でない id を拒否する", () => {
    expect(() => UserRefSchema.parse({ id: "not-a-uuid", name: "山田" })).toThrow();
  });
});

describe("PaginationQuerySchema", () => {
  it("デフォルト値が適用される", () => {
    const result = PaginationQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(20);
  });

  it("文字列の数値を coerce する", () => {
    const result = PaginationQuerySchema.parse({ page: "2", per_page: "50" });
    expect(result.page).toBe(2);
    expect(result.per_page).toBe(50);
  });

  it("page が 0 以下を拒否する", () => {
    expect(() => PaginationQuerySchema.parse({ page: 0 })).toThrow();
  });

  it("per_page が 100 超を拒否する", () => {
    expect(() => PaginationQuerySchema.parse({ per_page: 101 })).toThrow();
  });
});

describe("PaginationMetaSchema", () => {
  it("正しい形式を受け入れる", () => {
    const result = PaginationMetaSchema.parse({
      total: 53,
      page: 1,
      per_page: 20,
      total_pages: 3,
    });
    expect(result.total).toBe(53);
    expect(result.total_pages).toBe(3);
  });
});

describe("paginatedResponse", () => {
  it("data と meta を持つスキーマを生成する", () => {
    const ItemSchema = z.object({ id: z.string() });
    const ListSchema = paginatedResponse(ItemSchema);

    const result = ListSchema.parse({
      data: [{ id: "abc" }],
      meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});

describe("ErrorCodeSchema", () => {
  it("全エラーコードを受け入れる", () => {
    const codes = [
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
    ] as const;
    for (const code of codes) {
      expect(ErrorCodeSchema.parse(code)).toBe(code);
    }
  });

  it("未定義のエラーコードを拒否する", () => {
    expect(() => ErrorCodeSchema.parse("UNKNOWN_ERROR")).toThrow();
  });
});

describe("ErrorResponseSchema", () => {
  it("details なしのエラーレスポンスを受け入れる", () => {
    const result = ErrorResponseSchema.parse({
      error: { code: "NOT_FOUND", message: "リソースが見つかりません" },
    });
    expect(result.error.code).toBe("NOT_FOUND");
    expect(result.error.details).toBeUndefined();
  });

  it("details ありのエラーレスポンスを受け入れる", () => {
    const result = ErrorResponseSchema.parse({
      error: {
        code: "VALIDATION_ERROR",
        message: "入力値に誤りがあります",
        details: [{ field: "problem", message: "課題・相談は必須です" }],
      },
    });
    expect(result.error.details).toHaveLength(1);
    expect(result.error.details![0].field).toBe("problem");
  });
});

describe("ErrorDetailSchema", () => {
  it("field と message を受け入れる", () => {
    const result = ErrorDetailSchema.parse({ field: "email", message: "形式不正" });
    expect(result.field).toBe("email");
  });
});
