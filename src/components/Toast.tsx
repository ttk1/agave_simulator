import { useEffect } from "react";
import { useGame } from "../game/store";

export function Toast() {
  const toast = useGame((s) => s.toast);
  const setToast = useGame((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}
