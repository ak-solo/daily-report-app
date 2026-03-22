import { describe, it, expect } from "vitest";
import {
  CustomerBodySchema,
  CustomerResponseSchema,
  CustomerListQuerySchema,
  CustomerListResponseSchema,
} from "./customers";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const CUSTOMER_ID = "aa1b2c3d-1001-4001-8001-000000000001";

describe("CustomerBodySchema", () => {
  it("全項目入力を受け入れる", () => {
    const result = CustomerBodySchema.parse({
      name: "株式会社ABC",
      industry: "製造業",
      assigned_user_id: USER_ID,
    });
    expect(result.name).toBe("株式会社ABC");
    expect(result.industry).toBe("製造業");
  });

  it("必須項目のみで受け入れる", () => {
    const result = CustomerBodySchema.parse({ name: "株式会社ABC" });
    expect(result.name).toBe("株式会社ABC");
    expect(result.industry).toBeUndefined();
    expect(result.assigned_user_id).toBeUndefined();
  });

  it("name が空文字の場合を拒否する", () => {
    expect(() => CustomerBodySchema.parse({ name: "" })).toThrow();
  });

  it("name が 101 文字以上の場合を拒否する", () => {
    expect(() =>
      CustomerBodySchema.parse({ name: "あ".repeat(101) })
    ).toThrow();
  });

  it("name が 100 文字の場合を受け入れる", () => {
    const result = CustomerBodySchema.parse({ name: "あ".repeat(100) });
    expect(result.name).toHaveLength(100);
  });

  it("industry が 101 文字以上の場合を拒否する", () => {
    expect(() =>
      CustomerBodySchema.parse({ name: "テスト", industry: "あ".repeat(101) })
    ).toThrow();
  });

  it("assigned_user_id が UUID 形式でない場合を拒否する", () => {
    expect(() =>
      CustomerBodySchema.parse({ name: "テスト", assigned_user_id: "not-uuid" })
    ).toThrow();
  });
});

describe("CustomerResponseSchema", () => {
  it("assigned_user あり のレスポンスを受け入れる", () => {
    const result = CustomerResponseSchema.parse({
      id: CUSTOMER_ID,
      name: "株式会社ABC",
      industry: "製造業",
      assigned_user: { id: USER_ID, name: "山田 太郎" },
      created_at: "2023-04-01T00:00:00Z",
    });
    expect(result.assigned_user?.name).toBe("山田 太郎");
  });

  it("industry と assigned_user が null のレスポンスを受け入れる", () => {
    const result = CustomerResponseSchema.parse({
      id: CUSTOMER_ID,
      name: "合同会社DEF",
      industry: null,
      assigned_user: null,
      created_at: "2023-04-01T00:00:00Z",
    });
    expect(result.industry).toBeNull();
    expect(result.assigned_user).toBeNull();
  });
});

describe("CustomerListQuerySchema", () => {
  it("全パラメータを受け入れる", () => {
    const result = CustomerListQuerySchema.parse({
      name: "ABC",
      assigned_user_id: USER_ID,
      page: "1",
      per_page: "20",
    });
    expect(result.name).toBe("ABC");
    expect(result.page).toBe(1);
  });

  it("パラメータなしでデフォルト値を適用する", () => {
    const result = CustomerListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(20);
  });

  it("assigned_user_id が UUID 形式でない場合を拒否する", () => {
    expect(() =>
      CustomerListQuerySchema.parse({ assigned_user_id: "not-uuid" })
    ).toThrow();
  });
});

describe("CustomerListResponseSchema", () => {
  it("ページネーション付き顧客一覧を受け入れる", () => {
    const result = CustomerListResponseSchema.parse({
      data: [
        {
          id: CUSTOMER_ID,
          name: "株式会社ABC",
          industry: "製造業",
          assigned_user: null,
          created_at: "2023-04-01T00:00:00Z",
        },
      ],
      meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });
});
