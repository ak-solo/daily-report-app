import { describe, it, expect } from "vitest";
import { LoginRequestSchema, LoginResponseSchema, MeResponseSchema } from "./auth";

describe("LoginRequestSchema", () => {
  it("正常な入力を受け入れる", () => {
    const result = LoginRequestSchema.parse({
      email: "yamada@example.com",
      password: "password123",
    });
    expect(result.email).toBe("yamada@example.com");
    expect(result.password).toBe("password123");
  });

  it("メールアドレス未入力を拒否する", () => {
    expect(() =>
      LoginRequestSchema.parse({ email: "", password: "password123" })
    ).toThrow();
  });

  it("メールアドレス形式不正を拒否する", () => {
    expect(() =>
      LoginRequestSchema.parse({ email: "not-an-email", password: "password123" })
    ).toThrow();
  });

  it("パスワード未入力を拒否する", () => {
    expect(() =>
      LoginRequestSchema.parse({ email: "yamada@example.com", password: "" })
    ).toThrow();
  });

  it("フィールド欠損を拒否する", () => {
    expect(() => LoginRequestSchema.parse({ email: "yamada@example.com" })).toThrow();
    expect(() => LoginRequestSchema.parse({ password: "password123" })).toThrow();
    expect(() => LoginRequestSchema.parse({})).toThrow();
  });
});

describe("LoginResponseSchema", () => {
  it("正常なレスポンスを受け入れる", () => {
    const result = LoginResponseSchema.parse({
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      user: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "山田 太郎",
        email: "yamada@example.com",
        role: "sales",
      },
    });
    expect(result.token).toBeTruthy();
    expect(result.user.role).toBe("sales");
  });
});

describe("MeResponseSchema", () => {
  it("上長あり のレスポンスを受け入れる", () => {
    const result = MeResponseSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "山田 太郎",
      email: "yamada@example.com",
      role: "sales",
      manager: {
        id: "661f9511-f30c-52e5-b827-557766551111",
        name: "鈴木 一郎",
      },
    });
    expect(result.manager?.name).toBe("鈴木 一郎");
  });

  it("上長なし（null）のレスポンスを受け入れる", () => {
    const result = MeResponseSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "田中 一郎",
      email: "tanaka@example.com",
      role: "manager",
      manager: null,
    });
    expect(result.manager).toBeNull();
  });
});
