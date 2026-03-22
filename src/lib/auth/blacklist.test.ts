// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { addToBlacklist, isBlacklisted, _clearBlacklistForTesting } from "./blacklist";

beforeEach(() => {
  _clearBlacklistForTesting();
});

describe("addToBlacklist / isBlacklisted", () => {
  it("addToBlacklist 後に isBlacklisted が true を返すこと", () => {
    const jti = "test-jti-001";
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1時間後

    addToBlacklist(jti, expiresAt);

    expect(isBlacklisted(jti)).toBe(true);
  });

  it("未登録の jti は false を返すこと", () => {
    expect(isBlacklisted("unregistered-jti")).toBe(false);
  });

  it("複数の jti を個別に管理できること", () => {
    const jti1 = "jti-first";
    const jti2 = "jti-second";
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    addToBlacklist(jti1, expiresAt);

    expect(isBlacklisted(jti1)).toBe(true);
    expect(isBlacklisted(jti2)).toBe(false);

    addToBlacklist(jti2, expiresAt);

    expect(isBlacklisted(jti1)).toBe(true);
    expect(isBlacklisted(jti2)).toBe(true);
  });
});

describe("期限切れエントリの自動クリーンアップ", () => {
  it("期限切れの jti で isBlacklisted が false を返すこと", () => {
    const jti = "expired-jti";
    const expiresAt = new Date(Date.now() - 1000); // 1秒前（既に期限切れ）

    addToBlacklist(jti, expiresAt);

    // 期限切れのため false が返ること
    expect(isBlacklisted(jti)).toBe(false);
  });

  it("期限切れエントリが addToBlacklist 呼び出し時にクリーンアップされること", () => {
    const expiredJti = "expired-jti-to-cleanup";
    const validJti = "valid-jti";

    // 期限切れエントリを追加
    addToBlacklist(expiredJti, new Date(Date.now() - 1000));
    // 有効なエントリを追加（この際に期限切れエントリがクリーンアップされる）
    addToBlacklist(validJti, new Date(Date.now() + 60 * 60 * 1000));

    // 期限切れエントリは false
    expect(isBlacklisted(expiredJti)).toBe(false);
    // 有効エントリは true
    expect(isBlacklisted(validJti)).toBe(true);
  });

  it("有効期限ちょうどのエントリは期限切れ扱いになること", () => {
    const jti = "just-expired-jti";
    const expiresAt = new Date(Date.now() - 1); // 1ミリ秒前

    addToBlacklist(jti, expiresAt);

    expect(isBlacklisted(jti)).toBe(false);
  });

  it("まだ有効なエントリは true を返すこと", () => {
    const jti = "still-valid-jti";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分後

    addToBlacklist(jti, expiresAt);

    expect(isBlacklisted(jti)).toBe(true);
  });
});
