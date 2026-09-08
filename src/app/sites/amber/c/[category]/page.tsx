import { notFound, redirect } from "next/navigation";

import { getCategory } from "../../_data/categories";

// 分類頁。
//
// 現在只是一條轉址：分類篩選已經整合進首頁的 ?c= 參數，
// 而首頁才是唯一懂**多檔同開**的地方（列出所有進行中的檔期、
// 每張卡標檔期色、購物車分組結帳）。
//
// 為什麼不留一份自己的列表：這一頁原本用 currentBatch()，那支只回
// 最新的那一檔——韓國與日本同時開的時候，這裡會少掉一整檔的商品。
// 那個 bug 首頁已經修過一次（2026-09-07）。留兩份列表就是留兩份
// 要同步的邏輯，而漏掉的那一份不會有人發現，直到客人問「我的東西呢」。
//
// 舊連結（LINE 群組裡貼過的）還是活的，所以用轉址而不是直接刪掉。
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!getCategory(category)) notFound();
  redirect(`/?c=${encodeURIComponent(category)}`);
}
