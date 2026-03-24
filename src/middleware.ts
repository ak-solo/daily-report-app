import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const TOKEN_COOKIE_NAME = "token";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return new Uint8Array(0);
  }
  return new TextEncoder().encode(secret);
}

async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = getJwtSecret();
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;

  // ログイン済みユーザーが /login にアクセス → 日報一覧へリダイレクト
  if (pathname === "/login") {
    if (token && (await verifySessionToken(token))) {
      return NextResponse.redirect(new URL("/reports", req.url));
    }
    return NextResponse.next();
  }

  // 保護されたルート: 未認証 → /login へリダイレクト
  if (!token || !(await verifySessionToken(token))) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/reports/:path*",
    "/customers/:path*",
    "/users/:path*",
  ],
};
