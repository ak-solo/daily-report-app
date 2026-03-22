// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "./jwt";
import { addToBlacklist, _clearBlacklistForTesting } from "./blacklist";
import { getAuthUser, requireAuth, requireRole, AuthError } from "./middleware";

const testPayload = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "山田 太郎",
  role: "sales" as const,
};

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-middleware-tests-must-be-long";
  process.env.JWT_EXPIRES_IN = "1h";
});

beforeEach(() => {
  _clearBlacklistForTesting();
});

/** Authorization: Bearer <token> ヘッダー付きの NextRequest を作成するヘルパー */
function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token !== undefined) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new NextRequest("http://localhost/api/test", { headers });
}

describe("getAuthUser", () => {
  it("有効なトークンで JwtPayload を返すこと", async () => {
    const token = await signToken(testPayload);
    const req = makeRequest(token);

    const user = await getAuthUser(req);

    expect(user).not.toBeNull();
    expect(user?.id).toBe(testPayload.id);
    expect(user?.name).toBe(testPayload.name);
    expect(user?.role).toBe(testPayload.role);
    expect(typeof user?.jti).toBe("string");
  });

  it("Authorization ヘッダーなしで null を返すこと", async () => {
    const req = new NextRequest("http://localhost/api/test");

    const user = await getAuthUser(req);

    expect(user).toBeNull();
  });

  it("'Bearer ' プレフィックスのない Authorization ヘッダーで null を返すこと", async () => {
    const token = await signToken(testPayload);
    const req = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: token }, // "Bearer " プレフィックスなし
    });

    const user = await getAuthUser(req);

    expect(user).toBeNull();
  });

  it("不正なトークン文字列で null を返すこと", async () => {
    const req = makeRequest("invalid.jwt.token");

    const user = await getAuthUser(req);

    expect(user).toBeNull();
  });

  it("ブラックリスト済みトークンで null を返すこと", async () => {
    const token = await signToken(testPayload);
    const payload = await getAuthUser(makeRequest(token));
    expect(payload).not.toBeNull();

    // ブラックリストに追加
    addToBlacklist(payload!.jti, new Date(Date.now() + 60 * 60 * 1000));

    const user = await getAuthUser(makeRequest(token));
    expect(user).toBeNull();
  });

  it("Bearer の後にトークンが空の場合に null を返すこと", async () => {
    const req = new NextRequest("http://localhost/api/test", {
      headers: { Authorization: "Bearer " },
    });

    const user = await getAuthUser(req);

    expect(user).toBeNull();
  });
});

describe("requireAuth", () => {
  it("認証済みユーザーの JwtPayload を返すこと", async () => {
    const token = await signToken(testPayload);
    const req = makeRequest(token);

    const user = await requireAuth(req);

    expect(user.id).toBe(testPayload.id);
    expect(user.name).toBe(testPayload.name);
    expect(user.role).toBe(testPayload.role);
  });

  it("未認証時に AuthError（UNAUTHORIZED, 401）をスローすること", async () => {
    const req = new NextRequest("http://localhost/api/test");

    await expect(requireAuth(req)).rejects.toThrow(AuthError);

    try {
      await requireAuth(req);
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("UNAUTHORIZED");
      expect((err as AuthError).status).toBe(401);
    }
  });

  it("ブラックリスト済みトークンで AuthError（UNAUTHORIZED, 401）をスローすること", async () => {
    const token = await signToken(testPayload);
    const payload = await getAuthUser(makeRequest(token));
    addToBlacklist(payload!.jti, new Date(Date.now() + 60 * 60 * 1000));

    const req = makeRequest(token);

    try {
      await requireAuth(req);
      expect.fail("AuthError がスローされるはずです");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("UNAUTHORIZED");
      expect((err as AuthError).status).toBe(401);
    }
  });
});

describe("requireRole", () => {
  it("ユーザーが指定ロールを持つ場合にエラーなしでパスすること", async () => {
    const token = await signToken({ ...testPayload, role: "manager" });
    const user = (await getAuthUser(makeRequest(token)))!;

    // エラーなしでパスすること
    expect(() => requireRole(user, ["manager", "admin"])).not.toThrow();
  });

  it("ユーザーが複数の許可ロールのいずれかを持つ場合にパスすること", async () => {
    const token = await signToken({ ...testPayload, role: "admin" });
    const user = (await getAuthUser(makeRequest(token)))!;

    expect(() => requireRole(user, ["manager", "admin"])).not.toThrow();
  });

  it("ユーザーが指定ロールを持たない場合に AuthError（FORBIDDEN, 403）をスローすること", async () => {
    const token = await signToken({ ...testPayload, role: "sales" });
    const user = (await getAuthUser(makeRequest(token)))!;

    try {
      requireRole(user, ["manager", "admin"]);
      expect.fail("AuthError がスローされるはずです");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe("FORBIDDEN");
      expect((err as AuthError).status).toBe(403);
    }
  });

  it("sales ロールが admin 専用エンドポイントにアクセスした場合に FORBIDDEN をスローすること", async () => {
    const token = await signToken({ ...testPayload, role: "sales" });
    const user = (await getAuthUser(makeRequest(token)))!;

    expect(() => requireRole(user, ["admin"])).toThrow(AuthError);
  });

  it("manager ロールが sales 専用エンドポイントにアクセスした場合に FORBIDDEN をスローすること", async () => {
    const token = await signToken({ ...testPayload, role: "manager" });
    const user = (await getAuthUser(makeRequest(token)))!;

    expect(() => requireRole(user, ["sales"])).toThrow(AuthError);
  });
});

describe("AuthError", () => {
  it("code・message・status が正しく設定されること", () => {
    const err = new AuthError("UNAUTHORIZED", "認証が必要です。", 401);

    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("認証が必要です。");
    expect(err.status).toBe(401);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AuthError");
  });

  it("FORBIDDEN の AuthError が正しく設定されること", () => {
    const err = new AuthError("FORBIDDEN", "権限がありません。", 403);

    expect(err.code).toBe("FORBIDDEN");
    expect(err.status).toBe(403);
  });
});
