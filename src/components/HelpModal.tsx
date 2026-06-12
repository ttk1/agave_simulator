import { useGame } from "../game/store";

export function HelpModal() {
  const showHelp = useGame((s) => s.showHelp);
  const setShowHelp = useGame((s) => s.setShowHelp);

  if (!showHelp) return null;

  return (
    <div className="modal-bg" onClick={() => setShowHelp(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>🪴 AGAVE LIFE へようこそ</h2>
        <p>
          種や子株を育てて販売し、設備を充実させていくアガベ育成シミュレーター。
          目指せ、極上のドワーフ株！
        </p>
        <h3>遊び方</h3>
        <div className="report-line">1️⃣ 🏠 部屋の棚をクリック → 空きスロットをクリックして種まき</div>
        <div className="report-line">2️⃣ 💧 土が乾いたら水やり。ただしアガベは乾燥気味が好き。過湿+低温は根腐れの元</div>
        <div className="report-line">3️⃣ 💡 LED の強さと位置で光量が決まる。光が足りないと徒長してひょろひょろの葉に</div>
        <div className="report-line">4️⃣ 🧬 実生は個体値ガチャ。短葉・肉厚・強棘の当たり個体は高く売れる。斑入りは超レア</div>
        <div className="report-line">5️⃣ ⏰ 1日の作業時間は 8 時間。足りなければ「次の日へ」</div>
        <div className="report-line">6️⃣ 💰 育った株を売って、強い LED・大きい棚・高級品種に投資しよう</div>
        <h3>コツ</h3>
        <ul className="muted" style={{ lineHeight: 1.7 }}>
          <li>夏は蒸れ (サーキュレーター推奨)、冬は寒さ (ヒーター推奨) に注意</li>
          <li>鉢が大きいと乾きにくい。小苗は小鉢でスタート</li>
          <li>肥料をやりすぎると徒長して査定が下がる</li>
          <li>株が育ったら根詰まりの前に植え替え</li>
          <li>しっかり光を当てて育った葉は短く分厚くなり、査定額が上がる</li>
        </ul>
        <div style={{ textAlign: "right" }}>
          <button className="primary" onClick={() => setShowHelp(false)}>
            はじめる
          </button>
        </div>
      </div>
    </div>
  );
}
