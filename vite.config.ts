import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    // Windows ホスト + Docker バインドマウントではファイル変更イベントが
    // 伝わらないため、ポーリングで監視する
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
});
