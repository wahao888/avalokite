import { notFound } from "next/navigation";

// 未知的 /wenshan/* 路徑 → 品牌 404（not-found.tsx）
export default function WenshanCatchAll() {
  notFound();
}
