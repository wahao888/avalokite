import * as React from "react";

/* ═══════════════════════════════════════════════════════════════
   共享元素轉場（口味卡的那球冰 → 詳頁的大圖）

   用 React 的 <ViewTransition>（走瀏覽器原生 View Transitions API），
   而不是 Motion 的 layoutId：跨路由的 layoutId 需要兩邊活在同一棵樹裡，
   在 App Router 得靠攔截路由或全站 AnimatePresence 硬撐，脆弱又貴。
   原生版本由瀏覽器負責量測與補間，不支援的瀏覽器就是不動，不會壞。

   為什麼要這層包裝：
   Next 打包的 react 是 19.3 canary，有 ViewTransition；但 @types/react
   還沒有這個型別，直接 import 會編不過。這裡集中做一次轉型，
   順便在找不到該元件時安靜地退回原樣。
   ═══════════════════════════════════════════════════════════════ */

type MorphProps = {
  name: string;
  share?: string;
  default?: string;
  children: React.ReactNode;
};

const VT = (React as unknown as { ViewTransition?: React.ComponentType<MorphProps> })
  .ViewTransition;

export default function Morph({ name, children }: { name: string; children: React.ReactNode }) {
  if (!VT) return <>{children}</>;
  // share + default="none"：只有配對到同名元素時才 morph，
  // 其他不相干的轉場不會讓它跟著閃。
  return (
    <VT name={name} share="morph" default="none">
      {children}
    </VT>
  );
}
