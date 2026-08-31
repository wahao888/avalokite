import { SITE } from "../_data/site";

/* ═══════════════════════════════════════════════════════════════
   店舖位置示意圖

   為什麼不嵌 Google Maps iframe：
   ① 伺服器的 CSP 沒有 frame-src，會 fallback 到 default-src 'self'，
      iframe 直接被擋（deploy/nginx.conf）。
   ② 嵌入式地圖是別人的視覺語言，會在整個頁面上戳出一塊灰藍色。
   所以畫一張手繪感的示意圖，導航交給右下角的按鈕直接開 Google Maps。
   標題已註明「示意圖」，不假裝是實際比例的地圖。
   ═══════════════════════════════════════════════════════════════ */

const INK = "#16130F";
const ROAD = "#FFFDF7";
const LABEL = "#6E6558";

export default function StoreMap() {
  return (
    <div className="ml-map">
      <svg viewBox="0 0 640 430" role="img" aria-label="Monsieur Long 位置示意圖：大稻埕貴德街，鄰近淡水河與迪化街">
        <rect width="640" height="430" fill="#EFE8D8" />

        {/* 街廓底色 */}
        <g fill="#E7DEC9">
          <rect x="128" y="0" width="640" height="430" />
        </g>

        {/* ── 淡水河 ─────────────────────── */}
        <path d="M-10,-10 L110,-10 L74,440 L-10,440 Z" fill="#CBD8D2" />
        <g stroke="#A9BCB4" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M20,60 q18,10 0,20 q-18,10 0,20" />
          <path d="M46,190 q18,10 0,20 q-18,10 0,20" />
          <path d="M12,320 q18,10 0,20 q-18,10 0,20" />
        </g>
        <text x="26" y="410" fill="#5E7169" fontSize="15" fontFamily="var(--ml-mono)" letterSpacing="2">
          淡水河
        </text>

        {/* ── 道路 ───────────────────────── */}
        <g stroke={ROAD} strokeLinecap="square">
          {/* 橫向 */}
          <path d="M70,120 L640,120" strokeWidth="26" />
          <path d="M52,318 L640,318" strokeWidth="26" />
          {/* 縱向 */}
          <path d="M128,-10 L92,440" strokeWidth="24" />
          <path d="M204,-10 L168,440" strokeWidth="15" />
          <path d="M306,-10 L270,440" strokeWidth="20" />
          <path d="M436,-10 L400,440" strokeWidth="22" />
        </g>
        <g stroke={INK} strokeWidth="1.4" fill="none" opacity="0.5">
          <path d="M70,107 L640,107 M70,133 L640,133" />
          <path d="M52,305 L640,305 M52,331 L640,331" />
          <path d="M140,-10 L104,440 M116,-10 L80,440" />
          <path d="M211,-10 L175,440 M196,-10 L160,440" />
          <path d="M316,-10 L280,440 M296,-10 L260,440" />
          <path d="M447,-10 L411,440 M425,-10 L389,440" />
        </g>

        {/* ── 街名 ───────────────────────── */}
        <g fill={LABEL} fontSize="13" fontFamily="var(--ml-mono)" letterSpacing="1.5">
          <text transform="translate(112,392) rotate(-85.4)">環河北路一段</text>
          <text transform="translate(190,80) rotate(-85.4)" fill={INK} fontSize="14">
            貴德街
          </text>
          <text transform="translate(292,392) rotate(-85.4)">迪化街一段</text>
          <text transform="translate(422,80) rotate(-85.4)">延平北路二段</text>
          <text x="470" y="114">民生西路</text>
          <text x="470" y="312">南京西路</text>
        </g>

        {/* ── 大稻埕碼頭 ─────────────────── */}
        <g>
          <path d="M74,214 L118,208 L120,232 L76,238 Z" fill="#D6C9AE" stroke={INK} strokeWidth="1.6" />
          <text x="80" y="256" fill={LABEL} fontSize="12" fontFamily="var(--ml-mono)">
            大稻埕碼頭
          </text>
        </g>

        {/* ── 步行範圍 ───────────────────── */}
        <circle
          cx="186"
          cy="214"
          r="96"
          fill="none"
          stroke={INK}
          strokeWidth="1.6"
          strokeDasharray="7 8"
          opacity="0.32"
        />
        <text x="248" y="140" fill={LABEL} fontSize="11.5" fontFamily="var(--ml-mono)" letterSpacing="1">
          步行 3 分鐘
        </text>

        {/* ── 店家位置 ───────────────────── */}
        <g>
          <path
            d="M186,236 C170,214 162,204 162,192 a24,24 0 1 1 48,0 c0,12 -8,22 -24,44 Z"
            fill="#FFC732"
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="186" cy="191" r="8.5" fill={INK} />
          <g transform="translate(206,150)">
            <rect x="0" y="0" width="152" height="46" rx="6" fill={INK} />
            <text x="14" y="20" fill="#FFC732" fontSize="14" fontFamily="var(--ml-display)">
              Monsieur Long
            </text>
            <text x="14" y="36" fill="#F7F2E7" fontSize="11.5" fontFamily="var(--ml-mono)">
              貴德街 59 號
            </text>
          </g>
        </g>

        {/* 北方指標 */}
        <g transform="translate(596,44)" stroke={INK} fill={INK}>
          <path d="M0,-18 L7,10 L0,4 L-7,10 Z" strokeWidth="1.6" strokeLinejoin="round" fill="#FFFDF7" />
          <text x="-4.5" y="26" fontSize="12" fontFamily="var(--ml-mono)" stroke="none">
            N
          </text>
        </g>
      </svg>

      <div className="ml-map-foot">
        <span className="ml-mono" style={{ color: "var(--ml-ink-3)" }}>
          位置示意圖・非實際比例
        </span>
        <a
          className="ml-btn ml-btn--yellow"
          href={SITE.directionsUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          用 Google 導航前往
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 11L11 3M11 3H4.5M11 3V9.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
