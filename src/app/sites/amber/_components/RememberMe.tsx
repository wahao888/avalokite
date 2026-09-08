"use client";

import { useEffect } from "react";
import { rememberMyLink } from "./MyOrdersLink";

// 記住「我的訂單」連結。
//
// 客人一旦打開過那條連結，同一台裝置之後就從頁首直接進來，
// 連連結都不用點。只在客戶端執行，不渲染任何東西。
export function RememberMe({ path }: { path: string }) {
  useEffect(() => {
    rememberMyLink(path);
  }, [path]);
  return null;
}
