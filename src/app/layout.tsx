import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "営業日報",
  description: "営業日報システム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
