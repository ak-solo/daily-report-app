import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-8xl font-bold text-gray-200" aria-hidden="true">
        403
      </p>
      <h1 className="mt-4 text-2xl font-semibold text-gray-700">
        アクセス権限がありません
      </h1>
      <p className="mt-2 text-gray-500">
        このページを表示する権限がありません。
      </p>
      <Link
        href="/reports"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        日報一覧へ戻る
      </Link>
    </div>
  );
}
