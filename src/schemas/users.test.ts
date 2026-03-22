import { describe, it, expect } from "vitest";
import {
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserResponseSchema,
  UserListQuerySchema,
  UserListResponseSchema,
} from "./users";

describe("CreateUserRequestSchema", () => {
  const validUser = {
    name: "山田 太郎",
    email: "yamada@example.com",
    password: "Test1234!",
    role: "sales",
    manager_id: "661f9511-f30c-52e5-b827-557766551111",
  };

  it("全項目正常入力を受け入れる", () => {
    const result = CreateUserRequestSchema.parse(validUser);
    expect(result.name).toBe("山田 太郎");
    expect(result.role).toBe("sales");
  });

  it("manager_id なしで受け入れる", () => {
    const result = CreateUserRequestSchema.parse({
      name: "山田 太郎",
      email: "yamada@example.com",
      password: "Test1234!",
      role: "admin",
    });
    expect(result.manager_id).toBeUndefined();
  });

  it("name が空文字の場合を拒否する", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validUser, name: "" })
    ).toThrow();
  });

  it("name が 51 文字以上の場合を拒否する", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validUser, name: "あ".repeat(51) })
    ).toThrow();
  });

  it("name が 50 文字の場合を受け入れる", () => {
    const result = CreateUserRequestSchema.parse({ ...validUser, name: "あ".repeat(50) });
    expect(result.name).toHaveLength(50);
  });

  it("email が不正な形式の場合を拒否する", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validUser, email: "not-an-email" })
    ).toThrow();
  });

  it("password が 7 文字以下の場合を拒否する", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validUser, password: "Pass123" })
    ).toThrow();
  });

  it("password が 8 文字の場合を受け入れる", () => {
    const result = CreateUserRequestSchema.parse({ ...validUser, password: "Pass1234" });
    expect(result.password).toBe("Pass1234");
  });

  it("role が不正な値の場合を拒否する", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validUser, role: "superuser" })
    ).toThrow();
  });

  it("manager_id が UUID 形式でない場合を拒否する", () => {
    expect(() =>
      CreateUserRequestSchema.parse({ ...validUser, manager_id: "not-uuid" })
    ).toThrow();
  });
});

describe("UpdateUserRequestSchema", () => {
  const validUpdate = {
    name: "山田 太郎",
    email: "yamada@example.com",
    role: "sales",
  };

  it("password なしで受け入れる（変更しない）", () => {
    const result = UpdateUserRequestSchema.parse(validUpdate);
    expect(result.password).toBeUndefined();
  });

  it("password ありで受け入れる", () => {
    const result = UpdateUserRequestSchema.parse({ ...validUpdate, password: "NewPass123" });
    expect(result.password).toBe("NewPass123");
  });

  it("password が 7 文字以下の場合を拒否する", () => {
    expect(() =>
      UpdateUserRequestSchema.parse({ ...validUpdate, password: "Pass123" })
    ).toThrow();
  });
});

describe("UserResponseSchema", () => {
  it("上長ありのユーザーレスポンスを受け入れる", () => {
    const result = UserResponseSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "山田 太郎",
      email: "yamada@example.com",
      role: "sales",
      manager: { id: "661f9511-f30c-52e5-b827-557766551111", name: "鈴木 一郎" },
      created_at: "2023-04-01T00:00:00Z",
    });
    expect(result.manager?.name).toBe("鈴木 一郎");
  });

  it("上長なし（null）のユーザーレスポンスを受け入れる", () => {
    const result = UserResponseSchema.parse({
      id: "661f9511-f30c-52e5-b827-557766551111",
      name: "田中 一郎",
      email: "tanaka@example.com",
      role: "manager",
      manager: null,
      created_at: "2023-04-01T00:00:00Z",
    });
    expect(result.manager).toBeNull();
  });
});

describe("UserListQuerySchema", () => {
  it("全パラメータを受け入れる", () => {
    const result = UserListQuerySchema.parse({
      name: "山田",
      role: "sales",
      page: "1",
      per_page: "20",
    });
    expect(result.name).toBe("山田");
    expect(result.role).toBe("sales");
  });

  it("パラメータなしでデフォルト値を適用する", () => {
    const result = UserListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.role).toBeUndefined();
  });

  it("不正なロール値を拒否する", () => {
    expect(() => UserListQuerySchema.parse({ role: "superuser" })).toThrow();
  });
});

describe("UserListResponseSchema", () => {
  it("ページネーション付きユーザー一覧を受け入れる", () => {
    const result = UserListResponseSchema.parse({
      data: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          name: "山田 太郎",
          email: "yamada@example.com",
          role: "sales",
          manager: null,
          created_at: "2023-04-01T00:00:00Z",
        },
      ],
      meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].role).toBe("sales");
  });
});
