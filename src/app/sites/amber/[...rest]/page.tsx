import { notFound } from "next/navigation";

// 站內任何沒對應的路徑都回自家的 404，而不是主站那一份。
// proxy 已經把 <slug>.avalokite.xyz/* 改寫進來了，所以這裡收得到全部殘餘路徑。
export default function CatchAll() {
  notFound();
}
