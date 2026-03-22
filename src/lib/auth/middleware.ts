import { type NextRequest } from "next/server";
import { type Role } from "@/schemas/common";
import { verifyToken, JwtError, type JwtPayload } from "./jwt";
import { isBlacklisted } from "./blacklist";

// ============================================================
// エラークラス
// ============================================================

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN",
    message: string,
    public readonly status: 401 | 403
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ============================================================
// 認証ヘルパー
// ============================================================

/**
 * Authorization ヘッダーからトークンを取得・検証する。
 * 無効・ブラックリスト済みの場合は null を返す。
 */
export async function getAuthUser(req: NextRequest): Promise<JwtPayload | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length);
  if (!token) {
    return null;
  }

  let payload: JwtPayload;
  try {
    payload = await verifyToken(token);
  } catch (err) {
    if (err instanceof JwtError) {
      return null;
    }
    throw err;
  }

  // ブラックリスト確認
  if (isBlacklisted(payload.jti)) {
    return null;
  }

  return payload;
}

/**
 * 認証済みユーザー情報を返す。
 * 未認証の場合は AuthError をスロー。
 *
 * @example
 * export async function GET(req: NextRequest) {
 *   const user = await requireAuth(req);
 *   // user: { id, name, role }
 * }
 */
export async function requireAuth(req: NextRequest): Promise<JwtPayload> {
  const user = await getAuthUser(req);
  if (!user) {
    throw new AuthError("UNAUTHORIZED", "認証が必要です。", 401);
  }
  return user;
}

/**
 * ユーザーが指定ロールのいずれかを持つか確認する。
 * 権限不足の場合は AuthError をスロー。
 */
export function requireRole(user: JwtPayload, roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new AuthError("FORBIDDEN", "この操作を実行する権限がありません。", 403);
  }
}
