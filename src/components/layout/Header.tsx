import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { JwtPayload } from "@/lib/auth/jwt";

// ============================================================
// Server Action: ログアウト
// ============================================================

async function logout() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete("token");
  redirect("/login");
}

// ============================================================
// ナビゲーションリンク定義
// ============================================================

interface NavItem {
  label: string;
  href: string;
}

function getNavItems(role: JwtPayload["role"]): NavItem[] {
  const base: NavItem[] = [{ label: "日報一覧", href: "/reports" }];

  if (role === "admin") {
    return [
      ...base,
      { label: "顧客マスタ", href: "/customers" },
      { label: "ユーザーマスタ", href: "/users" },
    ];
  }

  return base;
}

// ============================================================
// Header コンポーネント（Server Component）
// ============================================================

interface HeaderProps {
  user: JwtPayload;
}

export default function Header({ user }: HeaderProps) {
  const navItems = getNavItems(user.role);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ロゴ */}
        <div className="flex items-center gap-6">
          <Link
            href="/reports"
            className="text-lg font-bold text-blue-600 hover:text-blue-700"
          >
            営業日報
          </Link>

          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex items-center gap-1" aria-label="メインナビゲーション">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 右側: ユーザーメニュー */}
        <div className="flex items-center gap-2">
          {/* デスクトップ: ユーザードロップダウン */}
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-1 text-sm font-medium text-gray-700"
                  aria-label="ユーザーメニューを開く"
                >
                  <span>{user.name}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{roleLabel(user.role)}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={logout}>
                  <DropdownMenuItem asChild>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      ログアウト
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* モバイル: ハンバーガーメニュー */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="メニューを開く"
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{roleLabel(user.role)}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <form action={logout}>
                  <DropdownMenuItem asChild>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      ログアウト
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// ヘルパー
// ============================================================

function roleLabel(role: JwtPayload["role"]): string {
  const labels: Record<JwtPayload["role"], string> = {
    sales: "営業担当者",
    manager: "上長",
    admin: "管理者",
  };
  return labels[role];
}
