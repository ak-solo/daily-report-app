// ============================================================
// ログアウト済みトークンのブラックリスト（インメモリ実装）
// ============================================================

/**
 * jti -> expiresAt のマッピング
 * expiresAt を過ぎたエントリは自動クリーンアップ対象となる
 */
const blacklist = new Map<string, Date>();

/**
 * ログアウト時にトークンの jti をブラックリストに追加する。
 * 追加時に期限切れエントリをクリーンアップする。
 */
export function addToBlacklist(jti: string, expiresAt: Date): void {
  cleanupExpired();
  blacklist.set(jti, expiresAt);
}

/**
 * 指定 jti がブラックリストに存在するか確認する。
 * 期限切れのエントリは false を返す（クリーンアップも行う）。
 */
export function isBlacklisted(jti: string): boolean {
  const expiresAt = blacklist.get(jti);
  if (expiresAt === undefined) {
    return false;
  }

  // 期限切れの場合はエントリを削除して false を返す
  if (expiresAt <= new Date()) {
    blacklist.delete(jti);
    return false;
  }

  return true;
}

/**
 * 期限切れのブラックリストエントリを削除する。
 */
function cleanupExpired(): void {
  const now = new Date();
  for (const [jti, expiresAt] of blacklist.entries()) {
    if (expiresAt <= now) {
      blacklist.delete(jti);
    }
  }
}

/**
 * テスト用: ブラックリストを全クリアする（本番コードから呼ばないこと）
 * @internal
 */
export function _clearBlacklistForTesting(): void {
  blacklist.clear();
}
