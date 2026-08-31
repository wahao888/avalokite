// 本機開發用：把店家 2026-08-30 IG 限動那份「今日 Gelato 口味」灌進 FlavorBoard，
// 這樣本機看到的首頁跟店家真的貼出來的一樣。
//
// 正式機不需要也不該跑這支——那邊的今日口味由店家自己在
// <slug>.avalokite.xyz/portal/board 勾選。下面的守衛就是為了防手滑。
//
//   node scripts/seed-monsieurlong-board.mjs
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
if (!/dev\.db/.test(url)) {
  console.error(
    `拒絕執行：DATABASE_URL 看起來不是本機開發資料庫（${url || "未設定"}）。\n` +
      "正式機的今日口味請由店家在 /portal/board 自行設定。",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const slugs = [
  "fleur-de-sel-milk",
  "pepper-sesame",
  "classic-chocolate",
  "summer",
  "peanut-youtiao",
  "pistachio",
  "murcott-kumquat",
  "strawberry-lemon",
];

const payload = {
  slugs: JSON.stringify(slugs),
  extras: "[]",
  note: "13:00 開賣，售完為止。",
};

await prisma.flavorBoard.upsert({
  where: { tenantId: "monsieurlong" },
  create: { tenantId: "monsieurlong", ...payload },
  update: payload,
});

console.log(`seeded ${slugs.length} flavours for monsieurlong`);
await prisma.$disconnect();
