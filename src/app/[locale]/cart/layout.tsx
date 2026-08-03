// 只為了掛 noindex：page.tsx 是 client component，不能匯出 metadata
export { NOINDEX as metadata } from "@/lib/site-routes";

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
