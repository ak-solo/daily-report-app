import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { type Role } from "@/schemas/common";

// ============================================================
// 環境変数のバリデーション
// ============================================================

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 環境変数が設定されていません。");
  }
  // Buffer.from を使用することで jsdom 環境でも正しい Uint8Array を返す
  return Buffer.from(secret);
}

function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "24h";
}

// ============================================================
// 型定義
// ============================================================

export interface JwtPayload {
  id: string;
  name: string;
  role: Role;
  jti: string;
}

export class JwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JwtError";
  }
}

// ============================================================
// JWT 発行
// ============================================================

/**
 * JWT トークンを発行する。
 * ペイロードには jti（ユニーク ID）が自動付与される。
 */
export async function signToken(payload: {
  id: string;
  name: string;
  role: Role;
}): Promise<string> {
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();

  const jti = crypto.randomUUID();

  return new SignJWT({ id: payload.id, name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

// ============================================================
// JWT 検証
// ============================================================

/**
 * JWT トークンを検証し、ペイロードを返す。
 * 無効・期限切れの場合は JwtError をスロー。
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  const secret = getJwtSecret();

  let payload: JWTPayload;
  try {
    const result = await jwtVerify(token, secret);
    payload = result.payload;
  } catch {
    throw new JwtError("トークンが無効または期限切れです。");
  }

  // ペイロードのフィールドを検証
  const { id, name, role, jti } = payload as JWTPayload & Record<string, unknown>;

  if (typeof id !== "string" || typeof name !== "string" || typeof role !== "string" || typeof jti !== "string") {
    throw new JwtError("トークンのペイロードが不正です。");
  }

  const validRoles: Role[] = ["sales", "manager", "admin"];
  if (!validRoles.includes(role as Role)) {
    throw new JwtError("トークンのロールが不正です。");
  }

  return {
    id,
    name,
    role: role as Role,
    jti,
  };
}
