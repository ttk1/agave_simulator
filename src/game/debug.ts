/**
 * デバッグモードの設定を表示してよい環境か。
 * ローカルで立てているとき (vite dev サーバー、または localhost で配信) のみ true。
 * GitHub Pages などの公開環境では設定ごと出さない。
 */
export function isLocalEnv(): boolean {
  return import.meta.env.DEV || ["localhost", "127.0.0.1"].includes(window.location.hostname);
}
