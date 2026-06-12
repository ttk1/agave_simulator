import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { useGame } from "./game/store";
import "./styles.css";

// dev ビルドではデバッグ・E2E 用にストアを公開する
if (import.meta.env.DEV) {
  (window as unknown as { __game: typeof useGame }).__game = useGame;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
