export default {
  // TS/TSX: ESLint 自動修正 → 型チェック（プロジェクト全体を1回だけ実行）
  "*.{ts,tsx}": [
    "eslint --fix",
    () => "tsc --noEmit",
  ],
};
