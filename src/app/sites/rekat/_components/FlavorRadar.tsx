import { PROFILE_LABEL, type Bean, type Profile } from "../_data/beans";
import { FAMILY } from "../_data/flavor-wheel";

/* 風味輪廓雷達圖。
 *
 * ⚠️ 這不是杯測分數。分數是由豆單上的風味描述推導出來的視覺化參數
 *    （見 _data/beans.ts 的可信度分級），前台一律附上這句話。
 *    王龍給了真正的 SCA 杯測表之後，換掉 profile 的數字、拿掉標註即可。
 *
 * 純 SVG，沒有 JS：進場動畫用 CSS 的 scale（見 rekat.css 的 .rk-radar__shape）。
 */

const AXES: (keyof Profile)[] = ["aroma", "acidity", "sweetness", "body", "aftertaste", "clean"];
const CX = 122;
const CY = 108;
const R = 74;
const MAX = 5;

const pt = (r: number, i: number) => {
  const a = ((i / AXES.length) * 360 - 90) * (Math.PI / 180);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};

const poly = (rs: number[]) =>
  rs.map((r, i) => pt(r, i).map((n) => n.toFixed(1)).join(",")).join(" ");

export default function FlavorRadar({ bean }: { bean: Bean }) {
  const fam = FAMILY[bean.families[0]!];
  const shape = poly(AXES.map((k) => (bean.profile[k] / MAX) * R));

  return (
    <svg viewBox="0 0 244 216" className="rk-radar" role="img" aria-label={`${bean.nameZh}的風味輪廓圖`}>
      {/* 蛛網：四圈 */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} className="rk-radar__web" points={poly(AXES.map(() => R * f))} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(R, i);
        return <line key={i} className="rk-radar__spoke" x1={CX} y1={CY} x2={x} y2={y} />;
      })}

      <polygon
        className="rk-radar__shape"
        points={shape}
        fill={`color-mix(in srgb, ${fam.color} 30%, transparent)`}
        stroke={fam.colorDeep}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
      />
      {AXES.map((k, i) => {
        const [x, y] = pt((bean.profile[k] / MAX) * R, i);
        return <circle key={k} cx={x} cy={y} r="2.6" fill={fam.colorDeep} />;
      })}

      {/* 軸標。上下兩端要用不同的 baseline，否則字會壓到圖上 */}
      {AXES.map((k, i) => {
        const [x, y] = pt(R + 17, i);
        const anchor = x < CX - 4 ? "end" : x > CX + 4 ? "start" : "middle";
        return (
          <g key={k}>
            <text
              className="rk-radar__label"
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline={y < CY - 20 ? "auto" : y > CY + 20 ? "hanging" : "middle"}
            >
              {PROFILE_LABEL[k]}
            </text>
            <text
              className="rk-radar__val"
              x={x}
              y={y + (y < CY - 20 ? -12 : y > CY + 20 ? 24 : 13)}
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              {bean.profile[k]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
