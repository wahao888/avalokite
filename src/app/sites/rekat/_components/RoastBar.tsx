import { ROAST, type RoastKey } from "../_data/beans";

/**
 * 烘焙度刻度。整條漸層是從生豆色一路到二爆後的深焙色，
 * 指針停在這支豆子的位置——用一張圖回答「淺焙到底有多淺」。
 *
 * 本店只做左半邊：高單價生豆買的是產地風味，深焙會把它燒掉。
 */
export default function RoastBar({ roast }: { roast: RoastKey }) {
  const r = ROAST[roast];
  return (
    <div className="rk-roastbar">
      <div className="rk-roastbar__track">
        <span className="rk-roastbar__pin" style={{ left: `${r.pos * 100}%` }} aria-hidden="true" />
      </div>
      <div className="rk-roastbar__scale">
        <span>極淺</span>
        <span>淺焙</span>
        <span>中焙</span>
        <span>中深</span>
        <span>深焙</span>
      </div>
      <p className="rk-mute" style={{ fontSize: 12.5, marginTop: 8 }}>
        本支為<b style={{ color: "var(--rk-ink)", fontWeight: 600 }}>{r.labelZh}</b>
        （{r.labelEn}）。整份豆單都停在一爆之後、二爆之前。
      </p>
    </div>
  );
}
