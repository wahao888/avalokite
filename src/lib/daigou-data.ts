// 代購站的資料層。這是 amber 這個租戶唯一能碰 Prisma 的檔案。
//
// tests/tenant-isolation.test.ts 用掃原始碼的方式強制四條規則：
//   ① 每個 export function 的第一個參數都是 tenantId
//   ② 每一次 prisma / tx 呼叫附近都要出現 tenantId
//   ③ 每個 create 的 data 都要帶 tenantId
//   ④ 禁用 findUnique / .update( / .delete( / deleteMany / $queryRaw / $executeRaw
//
// 第 ④ 條看起來很煩，但它換到的是一個很強的性質：**「忘記帶租戶範圍」在型別
// 層面就寫不出來**。findUnique 與 update 的 where 只吃唯一鍵，塞不進 tenantId；
// 改用 findFirst / updateMany 之後，where 一定寫得下 tenantId，
// 而 updateMany 回傳的 count 剛好就是授權判斷（count === 1 才是這個租戶的資料）。
//
// 刪除一律做軟刪除（deletedAt），不只是為了通過測試：
//   ・已下單的 DgLine 存的是快照，硬刪商品不會弄壞金額，但會毀掉 Amber
//     回答「我 9/20 到底上了什麼」的能力
//   ・代購下個月會重上同一件，軟刪除的商品正是「複製上一件」的來源
//   ・她在手機上單手操作，誤觸刪除是遲早的事
// 真正的實體刪除只有磁碟上的圖檔（storage.remove），那不是 Prisma 呼叫。

import crypto from "crypto";
import { prisma } from "./prisma";
import { storage, storageKey, thumbKey } from "./storage";
import { makeOrderId } from "./shop-order-id";
import { orderState } from "./daigou-deadline";

/** 交易內外通用的 client 型別 */
type Db = Pick<typeof prisma, "dgBatch"> extends never ? never : typeof prisma;
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const PAGE_SIZE = 50;

/** 子表的主鍵。人不會唸到它，所以用亂數就好（訂單／結單編號另有可讀的格式） */
const newId = (): string => crypto.randomBytes(12).toString("base64url");

/** 結單的分享 token：22 字元、不可猜。/s/<token> 靠它讓客人一點就看到明細 */
const newLookupToken = (): string => crypto.randomBytes(16).toString("base64url");

const now = () => new Date();

// ═══════════════════════════════════════════════════════════════
// 檔期
// ═══════════════════════════════════════════════════════════════

export async function listBatches(
  tenantId: string,
  opts: { includeArchived?: boolean } = {},
) {
  return prisma.dgBatch.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(opts.includeArchived ? {} : { status: { not: "archived" } }),
    },
    orderBy: { openAt: "desc" },
  });
}

export async function getBatch(tenantId: string, id: string) {
  return prisma.dgBatch.findFirst({ where: { tenantId, id, deletedAt: null } });
}

export async function getBatchBySlug(tenantId: string, slug: string) {
  return prisma.dgBatch.findFirst({ where: { tenantId, slug, deletedAt: null } });
}

/** 目前進行中的檔期。上架頁沒有這個就要先引導她建一檔，而不是給一張會失敗的表單 */
export async function currentBatch(tenantId: string) {
  return prisma.dgBatch.findFirst({
    where: { tenantId, status: "open", deletedAt: null },
    orderBy: { openAt: "desc" },
  });
}

/**
 * 所有進行中的檔期。
 *
 * ⚠ 前台一定要用這一支，不能用 currentBatch。
 * 她可能同時開韓國、日本、歐洲三檔——currentBatch 只回最新的那一檔，
 * 另外兩檔的商品在前台等於沒上架。（2026-09-07 發現的缺口。）
 */
export async function openBatches(tenantId: string) {
  return prisma.dgBatch.findMany({
    where: { tenantId, status: "open", deletedAt: null },
    orderBy: { openAt: "asc" },
  });
}

export async function createBatch(
  tenantId: string,
  input: {
    title: string;
    slug: string;
    defaultDeadlineAt?: Date | null;
    defaultEtaAt?: Date | null;
    shipPlan?: string | null;
    shippingFee?: number;
    freeShippingOver?: number | null;
    note?: string | null;
  },
) {
  return prisma.dgBatch.create({
    data: {
      id: makeOrderId("AB"),
      tenantId,
      slug: input.slug,
      title: input.title,
      defaultDeadlineAt: input.defaultDeadlineAt ?? null,
      defaultEtaAt: input.defaultEtaAt ?? null,
      shipPlan: input.shipPlan ?? null,
      shippingFee: input.shippingFee ?? 0,
      freeShippingOver: input.freeShippingOver ?? null,
      note: input.note ?? null,
    },
  });
}

export async function updateBatch(
  tenantId: string,
  id: string,
  patch: {
    title?: string;
    defaultDeadlineAt?: Date | null;
    defaultEtaAt?: Date | null;
    shipPlan?: string | null;
    shippingFee?: number;
    freeShippingOver?: number | null;
    note?: string | null;
    status?: string;
  },
): Promise<boolean> {
  const r = await prisma.dgBatch.updateMany({
    where: { tenantId, id, deletedAt: null },
    data: {
      ...patch,
      ...(patch.status === "closed" ? { closedAt: now() } : {}),
    },
  });
  return r.count === 1;
}

/**
 * 整批延長收單時間。
 *
 * 商品的 deadlineAt 在建立時是**複製**檔期的預設值而不是參照——改檔期不該
 * 無聲改掉已上架商品的截止時間。所以「延長全部」要是一個明確的動作，
 * 寫進每一列，她按下去就知道自己改了什麼。
 */
export async function extendBatchDeadline(
  tenantId: string,
  batchId: string,
  deadlineAt: Date,
): Promise<number> {
  await prisma.dgBatch.updateMany({
    where: { tenantId, id: batchId },
    data: { defaultDeadlineAt: deadlineAt },
  });
  const r = await prisma.dgProduct.updateMany({
    where: { tenantId, batchId, deletedAt: null },
    data: { deadlineAt },
  });
  return r.count;
}

// ═══════════════════════════════════════════════════════════════
// 商品
// ═══════════════════════════════════════════════════════════════

export async function listProducts(
  tenantId: string,
  opts: {
    batchId?: string;
    categoryKey?: string;
    status?: string;
    includeArchived?: boolean;
    skip?: number;
    take?: number;
  } = {},
) {
  return prisma.dgProduct.findMany({
    where: {
      tenantId,
      ...(opts.includeArchived ? {} : { deletedAt: null }),
      ...(opts.batchId ? { batchId: opts.batchId } : {}),
      ...(opts.categoryKey ? { categoryKey: opts.categoryKey } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    skip: opts.skip ?? 0,
    take: opts.take ?? PAGE_SIZE,
    include: {
      options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      images: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function countProducts(
  tenantId: string,
  opts: { batchId?: string; status?: string } = {},
) {
  return prisma.dgProduct.count({
    where: {
      tenantId,
      deletedAt: null,
      ...(opts.batchId ? { batchId: opts.batchId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
  });
}

export async function getProduct(tenantId: string, id: string) {
  return prisma.dgProduct.findFirst({
    where: { tenantId, id },
    include: {
      batch: true,
      options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      images: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getProductBySlug(tenantId: string, slug: string) {
  return prisma.dgProduct.findFirst({
    where: { tenantId, slug, deletedAt: null },
    include: {
      batch: true,
      options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      images: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export type CreateProductInput = {
  batchId: string;
  name: string;
  price: number;
  categoryKey?: string | null;
  note?: string | null;
  optionAxis?: string | null;
  options?: { label: string; price?: number | null; stock?: number | null }[];
  imageIds?: string[];
  deadlineAt?: Date | null;
  preorder?: boolean;
  showStock?: boolean;
  stock?: number | null;
  status?: string;
  /** 冪等鍵。4G 逾時重送時，同一個值只會產生一件商品 */
  clientRef?: string | null;
};

/**
 * 上架。
 *
 * ⚠ 冪等是這裡最重要的性質。她站在韓國店裡用 4G 送出，逾時重試很常見；
 * 沒有 clientRef 的話一次重試就會產生兩件一模一樣的上架商品，
 * 客人從兩邊各下單，直到結單對帳才會發現目錄早就被汙染了。
 */
export async function createProduct(tenantId: string, input: CreateProductInput) {
  if (input.clientRef) {
    const existing = await prisma.dgProduct.findFirst({
      where: { tenantId, clientRef: input.clientRef },
      include: { options: true, images: true },
    });
    if (existing) return existing;
  }

  const productId = newId();
  const slug = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;

  return prisma.$transaction(async (tx: Tx) => {
    const product = await tx.dgProduct.create({
      data: {
        id: productId,
        tenantId,
        batchId: input.batchId,
        slug,
        name: input.name,
        price: input.price,
        categoryKey: input.categoryKey ?? null,
        note: input.note ?? null,
        optionAxis: input.optionAxis ?? null,
        deadlineAt: input.deadlineAt ?? null,
        preorder: input.preorder ?? true,
        showStock: input.showStock ?? false,
        stock: input.stock ?? null,
        status: input.status ?? "live",
        clientRef: input.clientRef ?? null,
      },
    });

    for (const [i, o] of (input.options ?? []).entries()) {
      await tx.dgOption.create({
        data: {
          id: newId(),
          tenantId,
          productId,
          label: o.label,
          price: o.price ?? null,
          stock: o.stock ?? null,
          sortOrder: i,
        },
      });
    }

    // 圖片是先傳好的（跟她打字並行），這裡只是把它們掛上來。
    if (input.imageIds?.length) {
      for (const [i, imageId] of input.imageIds.entries()) {
        await tx.dgImage.updateMany({
          where: { tenantId, id: imageId, productId: null },
          data: { productId, sortOrder: i },
        });
      }
    }

    return product;
  });
}

export async function updateProduct(
  tenantId: string,
  id: string,
  patch: {
    name?: string;
    price?: number;
    categoryKey?: string | null;
    note?: string | null;
    deadlineAt?: Date | null;
    preorder?: boolean;
    showStock?: boolean;
    stock?: number | null;
    status?: string;
    sortOrder?: number;
  },
): Promise<boolean> {
  const r = await prisma.dgProduct.updateMany({
    where: { tenantId, id, deletedAt: null },
    data: patch,
  });
  return r.count === 1;
}

/** 軟刪除。連帶把圖片標記起來，交給清掃程序回收檔案 */
export async function archiveProduct(tenantId: string, id: string): Promise<boolean> {
  const stamp = now();
  const r = await prisma.dgProduct.updateMany({
    where: { tenantId, id, deletedAt: null },
    data: { deletedAt: stamp, status: "hidden" },
  });
  if (r.count !== 1) return false;

  await prisma.dgImage.updateMany({
    where: { tenantId, productId: id, deletedAt: null },
    data: { deletedAt: stamp },
  });
  return true;
}

/** 「複製上一件」的來源。刻意包含軟刪除的商品——上個月的目錄正是要重用的 */
export async function lastProduct(tenantId: string, batchId?: string) {
  return prisma.dgProduct.findFirst({
    where: { tenantId, ...(batchId ? { batchId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
}

/** 她最近用過的規格軸，做成上架頁的快捷鍵 */
export async function recentSpecAxes(tenantId: string, take = 6): Promise<string[]> {
  const rows = await prisma.dgProduct.findMany({
    where: { tenantId, optionAxis: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { optionAxis: true },
  });
  const seen: string[] = [];
  for (const r of rows) {
    if (r.optionAxis && !seen.includes(r.optionAxis)) seen.push(r.optionAxis);
    if (seen.length >= take) break;
  }
  return seen;
}

// ═══════════════════════════════════════════════════════════════
// 圖片
// ═══════════════════════════════════════════════════════════════

/**
 * 記錄一張已寫入儲存的圖片。
 * 用 uploadId 做冪等：4G 上「成功但逾時」的重送不會產生兩張一樣的圖。
 */
/**
 * 用冪等鍵查既有的圖片列。
 *
 * 上傳端點在**做任何 CPU 與磁碟工作之前**先呼叫這個——重送時直接回傳既有那一列，
 * 既不重算 sharp 也不寫出一份沒有任何列指向它的孤兒檔案
 * （sweepImages 走訪的是資料庫的列，看不到沒有列的檔案，所以那種孤兒永遠不會被回收）。
 */
export async function findImageByUploadId(tenantId: string, uploadId: string) {
  return prisma.dgImage.findFirst({ where: { tenantId, uploadId } });
}

export async function createImage(
  tenantId: string,
  input: {
    key: string;
    width: number;
    height: number;
    bytes: number;
    uploadId?: string | null;
    productId?: string | null;
  },
) {
  if (input.uploadId) {
    const existing = await prisma.dgImage.findFirst({
      where: { tenantId, uploadId: input.uploadId },
    });
    if (existing) return existing;
  }
  return prisma.dgImage.create({
    data: {
      id: newId(),
      tenantId,
      key: input.key,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
      uploadId: input.uploadId ?? null,
      productId: input.productId ?? null,
    },
  });
}

export async function archiveImage(tenantId: string, id: string): Promise<boolean> {
  const r = await prisma.dgImage.updateMany({
    where: { tenantId, id, deletedAt: null },
    data: { deletedAt: now() },
  });
  return r.count === 1;
}

/** 誤刪的救援：24 小時的緩衝期內把 deletedAt 清掉就回來了 */
export async function restoreImage(tenantId: string, id: string): Promise<boolean> {
  const r = await prisma.dgImage.updateMany({
    where: { tenantId, id, purgedAt: null },
    data: { deletedAt: null },
  });
  return r.count === 1;
}

export const SWEEP_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * 清掉該回收的圖片檔。
 *
 * 刻意**不用 cron**（部署腳本已經夠多活動零件了），改成機會式呼叫：
 * 每次上傳成功後掃一點、後台商品頁載入時掃一點。這正好在 Amber 活動的時候
 * 執行——也就是檔案累積的時候——而且自動節流。
 *
 * 兩種回收：
 *   ・deletedAt 過了緩衝期 → 大圖與縮圖都刪
 *   ・productId 為 null 且超過緩衝期 → 上傳到一半放棄的草稿，同上
 * 列本身永遠不刪，只補上 purgedAt，稽核軌跡才留得住。
 */
export async function sweepImages(tenantId: string, limit = 20): Promise<number> {
  const cutoff = new Date(Date.now() - SWEEP_GRACE_MS);
  const rows = await prisma.dgImage.findMany({
    where: {
      tenantId,
      purgedAt: null,
      OR: [
        { deletedAt: { lt: cutoff } },
        { productId: null, createdAt: { lt: cutoff } },
      ],
    },
    take: limit,
    select: { id: true, key: true },
  });

  let purged = 0;
  for (const row of rows) {
    await storage.remove(row.key);
    await storage.remove(thumbKey(row.key));
    const r = await prisma.dgImage.updateMany({
      where: { tenantId, id: row.id },
      data: { purgedAt: now() },
    });
    if (r.count === 1) purged += 1;
  }
  return purged;
}

export const FULL_PURGE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 檔期結束一段時間後只清大圖、保留縮圖。
 *
 * 一檔約 20 件 × 5 張 ≈ 28MB，其中 90% 是大圖；而大圖只有在商品還在賣的時候
 * 才有人看。縮圖（約 3MB／檔）是歷史訂單、結單畫面、通知文字與「複製上一件」
 * 唯一會用到的圖，留一輩子也不痛。
 * 這樣回收掉九成空間，又不會讓半年前的結單畫面變成一排破圖。
 */
export async function purgeBatchFullImages(
  tenantId: string,
  batchId: string,
): Promise<number> {
  const products = await prisma.dgProduct.findMany({
    where: { tenantId, batchId },
    select: { id: true },
  });
  const ids = products.map((p) => p.id);
  if (ids.length === 0) return 0;

  const rows = await prisma.dgImage.findMany({
    where: { tenantId, productId: { in: ids }, fullPurgedAt: null, purgedAt: null },
    select: { id: true, key: true },
  });

  let purged = 0;
  for (const row of rows) {
    // 只刪主圖，縮圖留著
    await storage.remove(row.key);
    const r = await prisma.dgImage.updateMany({
      where: { tenantId, id: row.id },
      data: { fullPurgedAt: now() },
    });
    if (r.count === 1) purged += 1;
  }
  await prisma.dgBatch.updateMany({
    where: { tenantId, id: batchId },
    data: { imagesPurgedAt: now() },
  });
  return purged;
}

/** 後台顯示「本檔期照片佔用 X MB」，讓她自己決定要不要提早回收 */
export async function batchImageBytes(tenantId: string, batchId: string): Promise<number> {
  const products = await prisma.dgProduct.findMany({
    where: { tenantId, batchId },
    select: { id: true },
  });
  const ids = products.map((p) => p.id);
  if (ids.length === 0) return 0;

  const rows = await prisma.dgImage.findMany({
    where: { tenantId, productId: { in: ids }, purgedAt: null, fullPurgedAt: null },
    select: { bytes: true },
  });
  return rows.reduce((s, r) => s + r.bytes, 0);
}

// ═══════════════════════════════════════════════════════════════
// 會員
// ═══════════════════════════════════════════════════════════════

/**
 * 用手機號碼歸戶。
 *
 * upsert 的 where 用的是 (tenantId, phoneDigits) 這個複合唯一鍵——
 * **唯一鍵本身以 tenantId 開頭**，所以 upsert 不會變成繞過租戶範圍的後門。
 * schema 裡每一個 @@unique 都這樣設計，有結構性測試守著。
 */
export async function upsertMemberByPhone(
  tenantId: string,
  phoneDigits: string,
  profile: { name?: string | null; email?: string | null; lineId?: string | null } = {},
) {
  return prisma.dgMember.upsert({
    where: { tenantId_phoneDigits: { tenantId, phoneDigits } },
    create: {
      id: newId(),
      tenantId,
      phoneDigits,
      name: profile.name ?? null,
      email: profile.email ?? null,
      lineId: profile.lineId ?? null,
    },
    // 客人這次填的資料比較新，但不要用空值覆蓋掉舊的
    update: {
      ...(profile.name ? { name: profile.name } : {}),
      ...(profile.email ? { email: profile.email } : {}),
      ...(profile.lineId ? { lineId: profile.lineId } : {}),
    },
  });
}

/**
 * 取得（必要時產生）這位會員的「我的訂單」連結 token。
 *
 * 懶生成：既有會員沒有 token，第一次需要時才補。
 * 這是「不用簡訊、不用密碼、不用 LINE Login」的身分方案——
 * 客人拿到一條 /me/<token> 傳給自己，之後隨時查得到所有的單。
 * 連線期間下三次單就有三個訂單編號，一定會弄丟。
 */
export async function ensureMemberToken(tenantId: string, memberId: string): Promise<string | null> {
  const m = await prisma.dgMember.findFirst({
    where: { tenantId, id: memberId },
    select: { lookupToken: true },
  });
  if (!m) return null;
  if (m.lookupToken) return m.lookupToken;

  const token = newLookupToken();
  // where 帶 lookupToken: null：兩個並行請求時只有一個寫得進去，
  // 另一個 count 會是 0，再讀一次就拿到先寫進去的那個。
  const r = await prisma.dgMember.updateMany({
    where: { tenantId, id: memberId, lookupToken: null },
    data: { lookupToken: token },
  });
  if (r.count === 1) return token;

  const again = await prisma.dgMember.findFirst({
    where: { tenantId, id: memberId },
    select: { lookupToken: true },
  });
  return again?.lookupToken ?? null;
}

/** 客人從「我的訂單」連結進來。token 是 22 字元亂數，不可猜 */
export async function getMemberByToken(tenantId: string, lookupToken: string) {
  return prisma.dgMember.findFirst({ where: { tenantId, lookupToken } });
}

export async function getMember(tenantId: string, id: string) {
  return prisma.dgMember.findFirst({ where: { tenantId, id } });
}

export async function findMemberByLineUserId(tenantId: string, lineUserId: string) {
  return prisma.dgMember.findFirst({ where: { tenantId, lineUserId } });
}

export async function listMembers(
  tenantId: string,
  opts: { q?: string; skip?: number; take?: number } = {},
) {
  return prisma.dgMember.findMany({
    where: {
      tenantId,
      mergedIntoId: null,
      ...(opts.q
        ? {
            OR: [
              { name: { contains: opts.q } },
              { phoneDigits: { contains: opts.q } },
              { lineId: { contains: opts.q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: opts.skip ?? 0,
    take: opts.take ?? PAGE_SIZE,
  });
}

/**
 * 綁定 LINE 帳號。
 *
 * where 帶 lineUserId: null 是關鍵：一個 LINE 帳號不能劫持一個已經綁了
 * 別的 LINE 的會員。count !== 1 就代表「這個會員已經綁過了」，要當作失敗。
 */
export async function linkLineUser(
  tenantId: string,
  memberId: string,
  lineUserId: string,
  displayName?: string | null,
): Promise<boolean> {
  const r = await prisma.dgMember.updateMany({
    where: { tenantId, id: memberId, lineUserId: null },
    data: { lineUserId, lineDisplayName: displayName ?? null },
  });
  return r.count === 1;
}

export async function updateMember(
  tenantId: string,
  id: string,
  patch: { name?: string; email?: string | null; lineId?: string | null; note?: string | null; blocked?: boolean },
): Promise<boolean> {
  const r = await prisma.dgMember.updateMany({ where: { tenantId, id }, data: patch });
  return r.count === 1;
}

/**
 * 合併會員：把 from 併進 into。
 *
 * 一定會發生——老客人換號碼、幫家人代訂、打錯一碼。發生的時候 Amber 會看到
 * 「同一個人有兩張結單、運費收了兩次」。
 *
 * from 這一列**保留**並寫上 mergedIntoId，不刪：日後要查得出當初併過。
 * 手機號碼要挪開，否則 (tenantId, phoneDigits) 的唯一鍵會擋住 into 日後改號。
 */
export async function mergeMembers(
  tenantId: string,
  fromId: string,
  intoId: string,
): Promise<boolean> {
  if (fromId === intoId) return false;

  const [from, into] = await Promise.all([
    prisma.dgMember.findFirst({ where: { tenantId, id: fromId } }),
    prisma.dgMember.findFirst({ where: { tenantId, id: intoId } }),
  ]);
  if (!from || !into) return false;

  return prisma.$transaction(async (tx: Tx) => {
    await tx.dgOrder.updateMany({ where: { tenantId, memberId: fromId }, data: { memberId: intoId } });
    await tx.dgSettlement.updateMany({ where: { tenantId, memberId: fromId }, data: { memberId: intoId } });
    await tx.dgLedger.updateMany({ where: { tenantId, memberId: fromId }, data: { memberId: intoId } });
    await tx.dgAddress.updateMany({ where: { tenantId, memberId: fromId }, data: { memberId: intoId } });
    await tx.dgMember.updateMany({
      where: { tenantId, id: fromId },
      data: {
        mergedIntoId: intoId,
        // 讓出唯一鍵，並保留原號碼在備註裡（稽核用）
        phoneDigits: null,
        lineUserId: null,
        note: `${from.note ?? ""}\n[已併入 ${intoId}，原手機 ${from.phoneDigits ?? "-"}]`.trim(),
      },
    });
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════
// 收件資料
// ═══════════════════════════════════════════════════════════════

export async function listAddresses(tenantId: string, memberId: string) {
  return prisma.dgAddress.findMany({
    where: { tenantId, memberId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function addAddress(
  tenantId: string,
  memberId: string,
  input: {
    kind: string;
    recipient: string;
    phone: string;
    label?: string | null;
    address?: string | null;
    cvsBrand?: string | null;
    cvsStoreId?: string | null;
    cvsStoreName?: string | null;
    cvsAddress?: string | null;
    isDefault?: boolean;
  },
) {
  if (input.isDefault) {
    await prisma.dgAddress.updateMany({
      where: { tenantId, memberId },
      data: { isDefault: false },
    });
  }
  return prisma.dgAddress.create({
    data: {
      id: newId(),
      tenantId,
      memberId,
      kind: input.kind,
      recipient: input.recipient,
      phone: input.phone,
      label: input.label ?? null,
      address: input.address ?? null,
      cvsBrand: input.cvsBrand ?? null,
      cvsStoreId: input.cvsStoreId ?? null,
      cvsStoreName: input.cvsStoreName ?? null,
      cvsAddress: input.cvsAddress ?? null,
      isDefault: input.isDefault ?? false,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 定價快照（priceLines 的不純那一半）
// ═══════════════════════════════════════════════════════════════

export type PricingKey = { productId: string; optionId: string | null };

/**
 * 把購物車裡的 id 換成可以計價的快照。
 *
 * 這是 REKAT 的 priceCart 拆開後「查表」的那一半；算術那一半是純函式
 * （_data/cart.ts 的 priceLines），前台與下單 API 共用，所以螢幕上的數字
 * 與入庫的數字仍然不可能分岔。
 */
export async function loadPricing(tenantId: string, keys: PricingKey[]) {
  const productIds = [...new Set(keys.map((k) => k.productId))];
  if (productIds.length === 0) return [];

  const products = await prisma.dgProduct.findMany({
    where: { tenantId, id: { in: productIds }, deletedAt: null },
    include: {
      batch: true,
      options: { where: { deletedAt: null, active: true } },
      images: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  const out = [];
  for (const key of keys) {
    const p = products.find((x) => x.id === key.productId);
    if (!p) continue;

    const opt = key.optionId ? p.options.find((o) => o.id === key.optionId) : null;
    // 指定了規格卻找不到 → 不產生快照，priceLines 會標成 gone
    if (key.optionId && !opt) continue;

    out.push({
      productId: p.id,
      optionId: opt?.id ?? null,
      batchId: p.batchId,
      batchTitle: p.batch.title,
      batchTone: p.batch.tone,
      name: p.name,
      optionLabel: opt?.label ?? null,
      unitPrice: opt?.price ?? p.price,
      imageKey: p.images[0]?.key ?? null,
      stock: opt ? opt.stock : p.stock,
      preorder: p.preorder,
      product: { deadlineAt: p.deadlineAt, status: p.status },
      batch: { defaultDeadlineAt: p.batch.defaultDeadlineAt, status: p.batch.status },
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// 訂單
// ═══════════════════════════════════════════════════════════════

export type OrderLineInput = { productId: string; optionId: string | null; qty: number };

export type CreateOrderInput = {
  batchId: string;
  memberId: string;
  lines: OrderLineInput[];
  ship: {
    kind: string;
    recipient: string;
    phone: string;
    address?: string | null;
    cvsBrand?: string | null;
    cvsStoreId?: string | null;
    cvsStoreName?: string | null;
    cvsAddress?: string | null;
  };
  note?: string | null;
  clientRef?: string | null;
  /** "manual" = Amber 在後台代打（LINE 社群 +1 轉進來的） */
  source?: string | null;
  /** 代客下單不受收單截止限制——她說收就收 */
  ignoreDeadline?: boolean;
};

export type RejectedLine = { productId: string; optionId: string | null; reason: string };

export class OrderRejected extends Error {
  constructor(public rejected: RejectedLine[]) {
    super("order rejected");
    this.name = "OrderRejected";
  }
}

/**
 * 建立訂單。
 *
 * 三件事必須在同一個交易裡完成，否則就是超賣或金額對不起來：
 *   ① 重讀價格與庫存（客戶端送來的金額一律忽略）
 *   ② 扣庫存
 *   ③ 歸入結單、建立訂單與逐行明細
 *
 * 任何一行不能下單就整張拒絕並回報是哪幾行——**不做部分接受**。
 * 部分接受等於收了跟客人螢幕上不一樣的錢。
 */
export async function createDaigouOrder(tenantId: string, input: CreateOrderInput) {
  if (input.clientRef) {
    const existing = await prisma.dgOrder.findFirst({
      where: { tenantId, clientRef: input.clientRef },
      include: { lines: true },
    });
    if (existing) return existing;
  }

  const at = now();

  return prisma.$transaction(async (tx: Tx) => {
    const productIds = [...new Set(input.lines.map((l) => l.productId))];
    const products = await tx.dgProduct.findMany({
      where: { tenantId, id: { in: productIds }, deletedAt: null },
      include: {
        batch: true,
        options: { where: { deletedAt: null, active: true } },
        images: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    const rejected: RejectedLine[] = [];
    const prepared: {
      line: OrderLineInput;
      name: string;
      optionLabel: string | null;
      unitPrice: number;
      imageKey: string | null;
      optionId: string | null;
    }[] = [];

    for (const line of input.lines) {
      const p = products.find((x) => x.id === line.productId);
      if (!p) {
        rejected.push({ ...line, reason: "gone" });
        continue;
      }
      const opt = line.optionId ? p.options.find((o) => o.id === line.optionId) : null;
      if (line.optionId && !opt) {
        rejected.push({ ...line, reason: "gone" });
        continue;
      }

      if (!input.ignoreDeadline) {
        const state = orderState(
          { deadlineAt: p.deadlineAt, status: p.status },
          { defaultDeadlineAt: p.batch.defaultDeadlineAt, status: p.batch.status },
          at,
        );
        if (!state.open) {
          rejected.push({ ...line, reason: state.reason });
          continue;
        }
      }

      const stock = opt ? opt.stock : p.stock;
      if (!p.preorder && stock !== null && stock < line.qty) {
        rejected.push({ ...line, reason: "oos" });
        continue;
      }

      prepared.push({
        line,
        name: p.name,
        optionLabel: opt?.label ?? null,
        unitPrice: opt?.price ?? p.price,
        imageKey: p.images[0]?.key ?? null,
        optionId: opt?.id ?? null,
      });
    }

    if (rejected.length > 0) throw new OrderRejected(rejected);
    if (prepared.length === 0) throw new OrderRejected([]);

    // 扣庫存。不限量（null）與預購商品不扣。
    for (const item of prepared) {
      if (item.optionId) {
        await tx.dgOption.updateMany({
          where: { tenantId, id: item.optionId, stock: { not: null } },
          data: { stock: { decrement: item.line.qty } },
        });
      } else {
        await tx.dgProduct.updateMany({
          where: { tenantId, id: item.line.productId, stock: { not: null } },
          data: { stock: { decrement: item.line.qty } },
        });
      }
    }

    const settlement = await pickSettlementTx(tx, tenantId, input.memberId, input.batchId);

    const itemsTotal = prepared.reduce(
      (s, i) => s + i.unitPrice * i.line.qty,
      0,
    );

    const orderId = makeOrderId("AM", at);
    const order = await tx.dgOrder.create({
      data: {
        id: orderId,
        tenantId,
        batchId: input.batchId,
        memberId: input.memberId,
        settlementId: settlement.id,
        shipKind: input.ship.kind,
        shipRecipient: input.ship.recipient,
        shipPhone: input.ship.phone,
        shipAddress: input.ship.address ?? null,
        shipCvsBrand: input.ship.cvsBrand ?? null,
        shipCvsStoreId: input.ship.cvsStoreId ?? null,
        shipCvsStoreName: input.ship.cvsStoreName ?? null,
        shipCvsAddress: input.ship.cvsAddress ?? null,
        note: input.note ?? null,
        itemsTotal,
        source: input.source ?? null,
        clientRef: input.clientRef ?? null,
      },
    });

    for (const item of prepared) {
      await tx.dgLine.create({
        data: {
          id: newId(),
          tenantId,
          orderId,
          productId: item.line.productId,
          optionId: item.optionId,
          name: item.name,
          optionLabel: item.optionLabel,
          unitPrice: item.unitPrice,
          qty: item.line.qty,
          amount: item.unitPrice * item.line.qty,
          imageKey: item.imageKey,
        },
      });
    }

    return order;
  });
}

export async function listOrders(
  tenantId: string,
  opts: { batchId?: string; memberId?: string; settlementId?: string; skip?: number; take?: number } = {},
) {
  return prisma.dgOrder.findMany({
    where: {
      tenantId,
      ...(opts.batchId ? { batchId: opts.batchId } : {}),
      ...(opts.memberId ? { memberId: opts.memberId } : {}),
      ...(opts.settlementId ? { settlementId: opts.settlementId } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: opts.skip ?? 0,
    take: opts.take ?? PAGE_SIZE,
    include: { lines: true, member: true },
  });
}

export async function getOrder(tenantId: string, id: string) {
  return prisma.dgOrder.findFirst({
    where: { tenantId, id },
    include: { lines: true, member: true, batch: true, settlement: true },
  });
}

/**
 * 客人查詢：手機 + 編號（完整或後 4 碼皆可）。
 *
 * 先用手機定位到會員，再在**這位會員自己的**單裡比對編號後綴——
 * 所以短碼不會撞到別人的單，而「查無」與「電話不符」在呼叫端回同一個 404，
 * 這支 API 不會變成編號探測器。
 *
 * 結單優先於訂單：客人真正想看的是「我要付多少」，那在結單上。
 */
export async function lookupForCustomer(
  tenantId: string,
  phoneDigits: string,
  code: string,
) {
  const member = await prisma.dgMember.findFirst({
    where: { tenantId, phoneDigits },
    select: { id: true },
  });
  if (!member) return null;

  const settlement = await prisma.dgSettlement.findFirst({
    where: {
      tenantId,
      memberId: member.id,
      OR: [{ id: code }, { id: { endsWith: `-${code}` } }],
    },
    include: {
      member: true,
      batch: true,
      orders: { where: { status: "open" }, include: { lines: true } },
    },
  });
  if (settlement) return { kind: "settlement" as const, settlement };

  const order = await prisma.dgOrder.findFirst({
    where: {
      tenantId,
      memberId: member.id,
      OR: [{ id: code }, { id: { endsWith: `-${code}` } }],
    },
    include: { lines: true, member: true, settlement: true },
  });
  if (order) return { kind: "order" as const, order };

  return null;
}

/** 查訂單：編號 + 手機雙因子，兩者不符與查無一律回 null（不做編號探測器） */
export async function getOrderForLookup(
  tenantId: string,
  id: string,
  phoneDigits: string,
) {
  const order = await prisma.dgOrder.findFirst({
    where: { tenantId, id },
    include: { lines: true, member: true, settlement: true },
  });
  if (!order) return null;
  if (order.member.phoneDigits !== phoneDigits) return null;
  return order;
}

/** 作廢（她自己的測試單）。作廢的訂單不進採購清單、不進結單金額 */
export async function voidOrder(tenantId: string, id: string): Promise<boolean> {
  const r = await prisma.dgOrder.updateMany({
    where: { tenantId, id },
    data: { status: "void", settlementId: null },
  });
  return r.count === 1;
}

// ═══════════════════════════════════════════════════════════════
// 逐行狀態與缺貨分配
// ═══════════════════════════════════════════════════════════════

export async function setLineStatus(
  tenantId: string,
  lineId: string,
  status: string,
  gotQty: number | null = null,
  note: string | null = null,
): Promise<boolean> {
  const r = await prisma.dgLine.updateMany({
    where: { tenantId, id: lineId },
    data: { status, gotQty, statusNote: note, statusAt: now() },
  });
  return r.count === 1;
}

/**
 * 套用一整組缺貨分配。一個交易寫完，不是二十次點擊。
 * 分配的規則本身是純函式（_data/allocate.ts），這裡只負責落地。
 */
export async function applyAllocations(
  tenantId: string,
  allocations: { lineId: string; gotQty: number; status: string }[],
): Promise<number> {
  const at = now();
  return prisma.$transaction(async (tx: Tx) => {
    let n = 0;
    for (const a of allocations) {
      const r = await tx.dgLine.updateMany({
        where: { tenantId, id: a.lineId },
        data: { status: a.status, gotQty: a.gotQty, statusAt: at },
      });
      n += r.count;
    }
    return n;
  });
}

/** 採購清單的原始資料。彙總與分組是純函式（_data/purchase-list.ts）的事 */
export async function purchaseLinesForBatch(tenantId: string, batchId: string) {
  return prisma.dgLine.findMany({
    where: { tenantId, order: { tenantId, batchId } },
    include: { order: { include: { member: true } } },
    orderBy: { createdAt: "asc" },
  });
}

// ═══════════════════════════════════════════════════════════════
// 結單
// ═══════════════════════════════════════════════════════════════

/**
 * 找出（或開一張）這位會員在這個檔期的結單。
 *
 * ⚠ 只重用 status === "open" 的。客人在 Amber 按下「結單」之後又下單，
 * 應該得到第二張結單——第一張的金額已經凍結而且通知出去了，
 * 事後把新的品項偷偷加進去，客人收到的金額就跟她看到的對不起來。
 *
 * schema 用 (tenantId, memberId, batchId, seq) 的唯一鍵擋重複；
 * 「至多一張 open」這條 SQLite 表達不了（沒有 partial unique index），
 * 由本函式保證。
 */
async function pickSettlementTx(tx: Tx, tenantId: string, memberId: string, batchId: string) {
  const open = await tx.dgSettlement.findFirst({
    where: { tenantId, memberId, batchId, status: "open" },
    orderBy: { seq: "desc" },
  });
  if (open) return open;

  const last = await tx.dgSettlement.findFirst({
    where: { tenantId, memberId, batchId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  const batch = await tx.dgBatch.findFirst({
    where: { tenantId, id: batchId },
    select: { shippingFee: true, defaultEtaAt: true },
  });

  return tx.dgSettlement.create({
    data: {
      id: makeOrderId("AS"),
      tenantId,
      memberId,
      batchId,
      seq: (last?.seq ?? 0) + 1,
      shippingFee: batch?.shippingFee ?? 0,
      etaAt: batch?.defaultEtaAt ?? null,
      lookupToken: newLookupToken(),
    },
  });
}

export async function pickSettlement(tenantId: string, memberId: string, batchId: string) {
  return prisma.$transaction((tx: Tx) => pickSettlementTx(tx, tenantId, memberId, batchId));
}

export async function listSettlements(
  tenantId: string,
  opts: { batchId?: string; status?: string; memberId?: string; skip?: number; take?: number } = {},
) {
  return prisma.dgSettlement.findMany({
    where: {
      tenantId,
      ...(opts.batchId ? { batchId: opts.batchId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.memberId ? { memberId: opts.memberId } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: opts.skip ?? 0,
    take: opts.take ?? PAGE_SIZE,
    // batch 一起帶：客人的「我的訂單」頁要顯示是哪一檔連線，
    // 而那一頁是跨檔期列出的（不像後台的列表已經先選好檔期）。
    include: { member: true, batch: true, orders: { include: { lines: true } } },
  });
}

export async function getSettlement(tenantId: string, id: string) {
  return prisma.dgSettlement.findFirst({
    where: { tenantId, id },
    include: {
      member: true,
      batch: true,
      ledger: { orderBy: { at: "desc" } },
      orders: { where: { status: "open" }, include: { lines: true } },
    },
  });
}

/** 客人從通知文字裡的 /s/<token> 進來。token 是 22 字元亂數，不可猜 */
export async function getSettlementByToken(tenantId: string, lookupToken: string) {
  return prisma.dgSettlement.findFirst({
    where: { tenantId, lookupToken },
    include: {
      member: true,
      batch: true,
      ledger: { orderBy: { at: "desc" } },
      orders: { where: { status: "open" }, include: { lines: true } },
    },
  });
}

/** 弄丟連結時的備援：編號 + 手機。不符與查無回同一個 null */
export async function getSettlementForLookup(
  tenantId: string,
  id: string,
  phoneDigits: string,
) {
  const s = await prisma.dgSettlement.findFirst({
    where: { tenantId, id },
    include: {
      member: true,
      batch: true,
      ledger: { orderBy: { at: "desc" } },
      orders: { where: { status: "open" }, include: { lines: true } },
    },
  });
  if (!s) return null;
  if (s.member.phoneDigits !== phoneDigits) return null;
  return s;
}

/**
 * 結單：把即時計算的金額凍結進資料庫。
 *
 * 凍結之後行狀態再變動，一律走 adjustAmount + adjustNote，
 * 不回頭改 grossAmount——金額已經通知出去了，改了就不可稽核。
 */
export async function freezeSettlement(
  tenantId: string,
  id: string,
  totals: {
    grossAmount: number;
    deductAmount: number;
    adjustAmount: number;
    shippingFee: number;
    creditApplied: number;
    payableAmount: number;
  },
): Promise<boolean> {
  const r = await prisma.dgSettlement.updateMany({
    where: { tenantId, id, status: "open" },
    data: { ...totals, status: "awaiting", closedAt: now() },
  });
  return r.count === 1;
}

export async function setSettlementStatus(
  tenantId: string,
  id: string,
  status: string,
): Promise<boolean> {
  const r = await prisma.dgSettlement.updateMany({
    where: { tenantId, id },
    data: {
      status,
      ...(status === "paid" ? { paidAt: now() } : {}),
      ...(status === "shipped" ? { shippedAt: now() } : {}),
    },
  });
  return r.count === 1;
}

export async function setSettlementShipping(
  tenantId: string,
  id: string,
  patch: { shippingFee?: number; shipNo?: string | null; etaAt?: Date | null; adjustAmount?: number; adjustNote?: string | null },
): Promise<boolean> {
  const r = await prisma.dgSettlement.updateMany({ where: { tenantId, id }, data: patch });
  return r.count === 1;
}

/** 手動把某張訂單挪進另一張結單（跨檔期併成一次出貨） */
export async function moveOrderToSettlement(
  tenantId: string,
  orderId: string,
  settlementId: string,
): Promise<boolean> {
  const target = await prisma.dgSettlement.findFirst({
    where: { tenantId, id: settlementId },
  });
  if (!target) return false;
  const r = await prisma.dgOrder.updateMany({
    where: { tenantId, id: orderId, status: "open" },
    data: { settlementId },
  });
  return r.count === 1;
}

/** 客人回報匯款末五碼 */
export async function reportRemit(
  tenantId: string,
  id: string,
  last5: string,
  remitName: string | null,
): Promise<boolean> {
  const r = await prisma.dgSettlement.updateMany({
    where: { tenantId, id },
    data: { remitLast5: last5, remitName, remitAt: now() },
  });
  return r.count === 1;
}

// ═══════════════════════════════════════════════════════════════
// 收退款流水
// ═══════════════════════════════════════════════════════════════

export async function addLedger(
  tenantId: string,
  input: {
    memberId: string;
    settlementId?: string | null;
    kind: string;
    amount: number;
    method: string;
    last5?: string | null;
    payerName?: string | null;
    note?: string | null;
  },
) {
  const entry = await prisma.dgLedger.create({
    data: {
      id: newId(),
      tenantId,
      memberId: input.memberId,
      settlementId: input.settlementId ?? null,
      kind: input.kind,
      amount: input.amount,
      method: input.method,
      last5: input.last5 ?? null,
      payerName: input.payerName ?? null,
      note: input.note ?? null,
    },
  });

  // paidAmount 是快取欄位，真實來源永遠是流水。這裡重算一次讓列表頁不用每次加總。
  if (input.settlementId) {
    const rows = await prisma.dgLedger.findMany({
      where: { tenantId, settlementId: input.settlementId },
      select: { kind: true, amount: true },
    });
    const paid = rows.reduce(
      (s, r) => s + (r.kind === "payment" ? r.amount : r.kind === "refund" ? -r.amount : 0),
      0,
    );
    await prisma.dgSettlement.updateMany({
      where: { tenantId, id: input.settlementId },
      data: { paidAmount: paid },
    });
  }
  return entry;
}

export async function memberLedgerEntries(tenantId: string, memberId: string) {
  return prisma.dgLedger.findMany({
    where: { tenantId, memberId },
    orderBy: { at: "desc" },
  });
}

/** 未使用的儲存格：讓 Db 型別別名有實際用途，避免 TS 抱怨未使用 */
export type DaigouDb = Db;
export { storageKey };
