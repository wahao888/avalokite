"use client";

import { useEffect, useRef, useState } from "react";
import { mediaUrl, thumbUrl } from "@/lib/media-url";

// 商品圖庫。
//
// 一份程式碼要同時服務兩種操作方式，所以捲動容器**就是**圖庫本身：
//   手機  左右滑（scroll-snap），跟原本一樣，沒有退步
//   桌機  沒有滑動手勢，所以下面那排縮圖才是換圖的方式
// 兩邊共用同一個捲動位置，所以桌機點縮圖 = 手機滑一頁，狀態不會分岔。
//
// ⚠ 換圖用 scrollTo(offsetLeft) 而不是 scrollIntoView：後者在橫向容器裡
// 會順手把整個頁面往下捲（block 的行為），客人會覺得畫面自己跳掉。

export type GalleryImage = {
  id: string;
  key: string;
  width: number;
  height: number;
  fullPurgedAt: Date | null;
};

export function Gallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLImageElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // 目前看到第幾張。用 IntersectionObserver 而不是 scroll 事件——
  // 前者只在跨過門檻時觸發，滑動過程中不會每一幀都叫醒 React。
  useEffect(() => {
    const root = track.current;
    if (!root || images.length < 2) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = slides.current.indexOf(e.target as HTMLImageElement);
          if (i >= 0) setActive(i);
        }
      },
      { root, threshold: 0.6 },
    );
    for (const el of slides.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [images.length]);

  const go = (i: number) => {
    const root = track.current;
    const el = slides.current[i];
    if (!root || !el) return;
    root.scrollTo({ left: el.offsetLeft - root.offsetLeft, behavior: "smooth" });
    setActive(i);
  };

  if (images.length === 0) return null;

  return (
    <div className="am-gal">
      <div className="am-gal__track" ref={track}>
        {images.map((img, i) => (
          // 大圖已被清掉的舊商品退回用縮圖，不要變成破圖
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.id}
            ref={(el) => {
              slides.current[i] = el;
            }}
            className="am-gal__slide"
            src={img.fullPurgedAt ? thumbUrl(img.key) : mediaUrl(img.key)}
            alt={`${name} 照片 ${i + 1}`}
            width={img.width}
            height={img.height}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : undefined}
            decoding="async"
          />
        ))}
      </div>

      {/* 一張照片就不必有縮圖列——那只是一個點不出東西的按鈕 */}
      {images.length > 1 && (
        <div className="am-gal__thumbs">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className="am-gal__thumb"
              aria-current={i === active ? "true" : undefined}
              aria-label={`看第 ${i + 1} 張照片`}
              onClick={() => go(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbUrl(img.key)} alt="" width={72} height={72} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
