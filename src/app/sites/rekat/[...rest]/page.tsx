import { notFound } from "next/navigation";

// 未知的路徑 → 品牌 404（not-found.tsx）
export default function RekatCatchAll() {
  notFound();
}
