// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import { signToken, verifyToken, JwtError } from "./jwt";

const testPayload = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "山田 太郎",
  role: "sales" as const,
};

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests-must-be-long-enough";
  process.env.JWT_EXPIRES_IN = "1h";
});

describe("signToken", () => {
  it("正常な JWT を発行し、文字列を返すこと", async () => {
    const token = await signToken(testPayload);
    expect(typeof token).toBe("string");
    // JWT は 3 つのセクション（header.payload.signature）で構成される
    expect(token.split(".")).toHaveLength(3);
  });

  it("発行したトークンのペイロードに jti が含まれること", async () => {
    const token = await signToken(testPayload);
    const payload = await verifyToken(token);
    expect(typeof payload.jti).toBe("string");
    expect(payload.jti.length).toBeGreaterThan(0);
  });

  it("異なる呼び出しで異なる jti が生成されること", async () => {
    const token1 = await signToken(testPayload);
    const token2 = await signToken(testPayload);
    const payload1 = await verifyToken(token1);
    const payload2 = await verifyToken(token2);
    expect(payload1.jti).not.toBe(payload2.jti);
  });
});

describe("verifyToken", () => {
  it("正常な JWT を検証してペイロードを返すこと", async () => {
    const token = await signToken(testPayload);
    const payload = await verifyToken(token);

    expect(payload.id).toBe(testPayload.id);
    expect(payload.name).toBe(testPayload.name);
    expect(payload.role).toBe(testPayload.role);
  });

  it("ペイロードに jti が含まれること", async () => {
    const token = await signToken(testPayload);
    const payload = await verifyToken(token);
    expect(payload.jti).toBeDefined();
    expect(typeof payload.jti).toBe("string");
  });

  it("全ロール（sales / manager / admin）の JWT を正常に検証できること", async () => {
    for (const role of ["sales", "manager", "admin"] as const) {
      const token = await signToken({ ...testPayload, role });
      const payload = await verifyToken(token);
      expect(payload.role).toBe(role);
    }
  });

  it("不正なトークン文字列で JwtError をスローすること", async () => {
    await expect(verifyToken("invalid.token.string")).rejects.toThrow(JwtError);
  });

  it("異なるシークレットで署名されたトークンで JwtError をスローすること", async () => {
    // 別のシークレットでトークンを生成するため、一時的に環境変数を変更
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "different-secret-key-must-be-long-enough-too";
    const tokenWithOtherSecret = await signToken(testPayload);

    // 元のシークレットに戻して検証
    process.env.JWT_SECRET = originalSecret;
    await expect(verifyToken(tokenWithOtherSecret)).rejects.toThrow(JwtError);
  });

  it("期限切れトークンで JwtError をスローすること", async () => {
    // 有効期限を 1 秒に設定してトークンを生成
    process.env.JWT_EXPIRES_IN = "1s";
    const expiredToken = await signToken(testPayload);

    // 少し待機して期限切れにする
    await new Promise((resolve) => setTimeout(resolve, 1100));

    process.env.JWT_EXPIRES_IN = "1h";
    await expect(verifyToken(expiredToken)).rejects.toThrow(JwtError);
  });

  it("空文字列のトークンで JwtError をスローすること", async () => {
    await expect(verifyToken("")).rejects.toThrow(JwtError);
  });
});

describe("JWT_SECRET 未設定時", () => {
  it("JWT_SECRET が未設定の場合に signToken がエラーをスローすること", async () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    await expect(signToken(testPayload)).rejects.toThrow("JWT_SECRET 環境変数が設定されていません。");

    process.env.JWT_SECRET = originalSecret;
  });

  it("JWT_SECRET が未設定の場合に verifyToken がエラーをスローすること", async () => {
    const originalSecret = process.env.JWT_SECRET;
    const token = await signToken(testPayload);

    delete process.env.JWT_SECRET;

    await expect(verifyToken(token)).rejects.toThrow("JWT_SECRET 環境変数が設定されていません。");

    process.env.JWT_SECRET = originalSecret;
  });
});
