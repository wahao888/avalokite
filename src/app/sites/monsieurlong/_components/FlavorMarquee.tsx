/**
 * 今日口味跑馬燈。
 *
 * 純 CSS 動畫、零 JS：一組項目複製兩份，整條 track 平移 -50% 後
 * 無縫接回原點。hover 暫停、prefers-reduced-motion 直接停住，
 * 兩件事都在 CSS 裡（見 monsieurlong.css 的 .ml-marquee）。
 */
export default function FlavorMarquee({
  items,
}: {
  items: { key: string; zh: string; en?: string }[];
}) {
  if (items.length === 0) return null;

  // 項目太少時多複製幾輪，否則跑馬燈會出現空白段
  const reps = items.length < 6 ? Math.ceil(6 / items.length) : 1;
  const group = Array.from({ length: reps }, () => items).flat();
  const seconds = Math.max(18, group.length * 4.2);

  const Group = ({ hidden }: { hidden?: boolean }) => (
    <div className="ml-marquee-group" aria-hidden={hidden}>
      {group.map((it, i) => (
        <span className="ml-marquee-item" key={`${it.key}-${i}`}>
          {it.zh}
          {it.en && <small>{it.en}</small>}
        </span>
      ))}
    </div>
  );

  return (
    <div className="ml-marquee">
      <div className="ml-marquee-track" style={{ ["--ml-marquee-dur" as string]: `${seconds}s` }}>
        <Group />
        {/* 第二份只是為了無縫接回，對輔助技術隱藏，避免整串被唸兩次 */}
        <Group hidden />
      </div>
    </div>
  );
}
