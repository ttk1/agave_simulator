# 🪴 AGAVE LIFE — アガベ育成シミュレーター

観葉植物アガベの育成・販売シミュレーションゲーム。育成株は遺伝子 (個体値) と
育成履歴 (徒長・締まり) を反映して **3D でプロシージャル描画** されます。

## 遊び方の流れ

```
種・子株を購入 → 棚に置いて育成 (水やり/光/温度/肥料/植え替え) → 販売 → 設備投資
```

- **1日の行動時間は 8 時間 (480分)**。水やり 3分、植え替え 20分、販売 15分…と
  各行動に時間がかかる。やることがなくなったら「次の日へ」。
- **個体値 (遺伝子)**: 短葉・葉の厚み・棘のゴツさ・成長速度・色味・斑。実生は
  育成株サイズになるまで個体値が分からないガチャ。子株は確定品質。
- **環境**: 季節で室温・湿度が変動。LED の強さと取り付け位置で各スロットの光量が
  決まる。光が足りない時期に出た葉は **長く・薄く・垂れて (徒長)**、強光で出た
  葉は **短く・分厚く** なり、そのまま 3D モデルと査定額に反映される。
- **リスク**: 過湿+低温で根腐れ、夏の蒸れで害虫、冬の寒さで凍傷、根詰まり。
  サーキュレーター・ヒーターで対策。
- **経済**: 販売収益で LED・棚・鉢・土・肥料・電気代を賄い、高級品種 (白鯨、
  黒鯨、姫巌竜…) に投資していく。斑入り個体は超高額。
- **部屋レイアウト**: 棚をどのマスに置くかはプレイヤーが決める。棚のどの段・
  どの列に株を置くか (LED との距離) も自由。
- セーブは **localStorage に自動保存** (サーバー無し)。

## 公開 (GitHub Pages)

main ブランチへ push すると GitHub Actions
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) がビルドして
GitHub Pages へ自動デプロイする。

- 公開 URL: https://ttk1.github.io/agave_simulator/
- 初回のみ、リポジトリの **Settings → Pages → Source を「GitHub Actions」** に
  設定する必要がある。
- Vite の `base` は相対パス (`"./"`) なのでサブパス配信でもそのまま動く。

## 技術スタック

- Vite + React + TypeScript
- Three.js / @react-three/fiber / @react-three/drei — アガベのプロシージャル 3D 描画
  (葉 1 枚ごとに出葉時の環境を焼き込んだジオメトリを生成)
- zustand (+persist) — 状態管理と localStorage セーブ

## 開発 (Docker)

Node の実行はすべて Docker コンテナで行う。

```powershell
# 依存インストール
docker run --rm -v "${PWD}:/app" -w /app node:24 npm install

# dev サーバー (http://localhost:5173)
docker run --rm -p 5173:5173 -v "${PWD}:/app" -w /app node:24 npx vite --host 0.0.0.0

# ビルド (型チェック込み)
docker run --rm -v "${PWD}:/app" -w /app node:24 npm run build

# E2E 動作確認 (dev サーバー起動中に実行。スクショは .verify/ に出力)
docker run --rm -v "${PWD}:/app" -w /tmp mcr.microsoft.com/playwright:v1.52.0-noble `
  bash -c "npm i playwright@1.52.0 --silent && node /app/scripts/verify.mjs"
```

## 主要ディレクトリ

| パス | 内容 |
| --- | --- |
| `src/game/` | ドメインロジック (品種・遺伝子・環境・日次シミュレーション・経済・ストア) |
| `src/three/` | 3D 描画 (葉ジオメトリ生成、株メッシュ、棚シーン、フォトビューア) |
| `src/components/` | UI (HUD・部屋・棚・株詳細・ショップ・図鑑・モーダル類) |
| `scripts/verify.mjs` | Playwright による E2E 検証スクリプト |
