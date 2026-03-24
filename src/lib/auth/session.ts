import { cookies } from "next/headers";
import { verifyToken, JwtError, type JwtPayload } from "./jwt";
import { isBlacklisted } from "./blacklist";

const TOKEN_COOKIE_NAME = "token";

/**
 * サーバーコンポーネントからCookieのJWTトークンを取得してユーザー情報を返す。
 * トークンがない、無効、またはブラックリスト済みの場合は null を返す。
 */
export async function getSessionUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

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

  if (isBlacklisted(payload.jti)) {
    return null;
  }

  return payload;
}
