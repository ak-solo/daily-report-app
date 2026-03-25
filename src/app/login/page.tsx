import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/reports");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          営業日報
        </h1>
        <p className="text-center text-sm text-gray-500">
          ログイン機能は近日公開予定です。
        </p>
      </div>
    </div>
  );
}
