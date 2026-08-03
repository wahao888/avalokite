// 涵蓋 /order/lookup 與 /order/result：兩者都是個人訂單資料，不該進搜尋結果。
// lookup 是 client component，不能自己匯出 metadata，統一掛這裡。
export { NOINDEX as metadata } from "@/lib/site-routes";

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
