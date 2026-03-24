import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Forbidden from "./Forbidden";

// next/link をモック
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Forbidden", () => {
  it("403 と見出しを表示する", () => {
    render(<Forbidden />);
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "アクセス権限がありません" })).toBeInTheDocument();
  });

  it("エラーメッセージを表示する", () => {
    render(<Forbidden />);
    expect(screen.getByText("このページを表示する権限がありません。")).toBeInTheDocument();
  });

  it("日報一覧へのリンクを表示する", () => {
    render(<Forbidden />);
    const link = screen.getByRole("link", { name: "日報一覧へ戻る" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/reports");
  });
});
