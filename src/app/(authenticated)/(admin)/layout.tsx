import { getSessionUser } from "@/lib/auth/session";
import Forbidden from "@/components/errors/Forbidden";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  // (authenticated)/layout.tsx が未認証リダイレクトを処理するため、
  // ここでは user が null になることはないが、型安全のために確認する
  if (!user || user.role !== "admin") {
    return <Forbidden />;
  }

  return <>{children}</>;
}
