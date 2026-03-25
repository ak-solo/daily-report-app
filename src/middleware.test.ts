// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { middleware } from "./middleware";
import { SignJWT } from "jose";

// next/server の NextRequest / NextResponse を vitest 環境で使えるようにする
// (next は Node.js 環境でも動作するため直接 import 可能)
import { NextRequest } from "next/server";

const BASE_URL = "http://localhost:3000";

const originalEnv = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-middleware-tests";
});

afterAll(() => {
  process.env.JWT_SECRET = originalEnv;
});

/** テスト用にミドルウェアと同じ TextEncoder でトークンを署名する */
async function signTestToken(payload: { id: string; name: string; role: string }): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

function makeRequest(pathname: string, token?: string): NextRequest {
  const url = new URL(pathname, BASE_URL);
  const req = new NextRequest(url);
  if (token) {
    req.cookies.set("token", token);
  }
  return req;
}

describe("middleware", () => {
  describe("/login へのアクセス", () => {
    it("未認証ユーザーは /login をそのまま表示できる", async () => {
      const req = makeRequest("/login");
      const res = await middleware(req);
      // リダイレクトなし → next() を返す
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("認証済みユーザーは /reports へリダイレクトされる", async () => {
      const token = await signTestToken({ id: "user-1", name: "山田 太郎", role: "sales" });
      const req = makeRequest("/login", token);
      const res = await middleware(req);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`${BASE_URL}/reports`);
    });
  });

  describe("保護されたルートへのアクセス", () => {
    it("未認証ユーザーは /reports へアクセスすると /login にリダイレクトされる", async () => {
      const req = makeRequest("/reports");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
    });

    it("認証済みユーザーは /reports へアクセスできる", async () => {
      const token = await signTestToken({ id: "user-1", name: "山田 太郎", role: "sales" });
      const req = makeRequest("/reports", token);
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    it("無効なトークンでアクセスすると /login にリダイレクトされる", async () => {
      const req = makeRequest("/reports", "invalid-token");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
    });

    it("未認証ユーザーは /customers へアクセスすると /login にリダイレクトされる", async () => {
      const req = makeRequest("/customers");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
    });

    it("未認証ユーザーは /users へアクセスすると /login にリダイレクトされる", async () => {
      const req = makeRequest("/users");
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
    });

    it("元のパスが from クエリパラメータとして付与される", async () => {
      const req = makeRequest("/reports");
      const res = await middleware(req);
      const location = new URL(res.headers.get("location")!);
      expect(location.searchParams.get("from")).toBe("/reports");
    });
  });
});
