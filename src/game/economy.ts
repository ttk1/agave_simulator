import { SPECIES_MAP } from "./constants";
import { formQuality, geneticsQuality } from "./genetics";
import type { Plant } from "./types";

/** 株の現在の販売見込み価格 (market 補正前) */
export function rawSalePrice(p: Plant): number {
  if (p.stage !== "plant" || p.leaves.length < 4) return 0;
  const sp = SPECIES_MAP[p.speciesId];
  const n = p.leaves.length;
  // サイズ: 葉数とスケールで増える
  const sizeF = Math.pow(n / 10, 1.15) * Math.pow(p.leafScale / 0.6, 1.6);
  // 個体値と仕上がり
  const gq = geneticsQuality(p.genetics);
  const fq = formQuality(p);
  const qualityF = 0.35 + gq * 0.9 + fq * 0.75;
  // 斑入りはプレミア
  const varieF = 1 + p.genetics.variegation * 5;
  const healthF = 0.3 + (p.health / 100) * 0.7;
  const price = sp.basePrice * sizeF * qualityF * varieF * healthF;
  return Math.max(100, Math.round(price / 10) * 10);
}

export function salePrice(p: Plant, market: number): number {
  return Math.round((rawSalePrice(p) * market) / 10) * 10;
}

/** 市場乗数のランダムウォーク */
export function nextMarket(m: number): { value: number; news: string | null } {
  let v = m + (Math.random() - 0.5) * 0.12;
  let news: string | null = null;
  if (Math.random() < 0.05) {
    if (Math.random() < 0.5) {
      v += 0.25;
      news = "📈 SNSでアガベブーム再燃！相場が上昇しています";
    } else {
      v -= 0.22;
      news = "📉 大量入荷により相場が下落しています…";
    }
  }
  v = Math.max(0.7, Math.min(1.7, v));
  return { value: Math.round(v * 100) / 100, news };
}

export function fmtMoney(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}
