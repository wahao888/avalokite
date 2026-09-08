"use client";

import { useState } from "react";
import { PhotoTile, MAX_PHOTOS, type PhotoSlot } from "./PhotoTile";

// 「幫既有商品補照片」。
//
// 上架頁一開始就能選好幾張，但商品上架之後原本沒有任何加照片的路徑——
// 要補一張正面照只能把整件刪掉重上。而代購最常見的情況正是
// 「先用店裡隨手拍的上架，回台灣再補正式照」。
//
// 上傳本身完全重用 PhotoTile（壓縮、併發度 2、逐張重試、uploadId 冪等）。
// 這裡只多做一件事：把傳好的 image id 收進一個 hidden input，
// 再用一般的 HTML 表單送出——跟這一頁其他區塊同一個形狀，
// 伺服器端也就不必為它多開一條 JSON 路徑。

export function AddPhotos({ productId, existing }: { productId: string; existing: number }) {
  const [slots, setSlots] = useState<PhotoSlot[]>([]);

  const done = slots.filter((s) => s.status === "done" && s.result);
  const busy = slots.some((s) => s.status === "working" || s.status === "pending");
  const room = MAX_PHOTOS - existing;

  if (room <= 0) {
    return (
      <p className="p-dg-hint">
        這件商品已經有 {existing} 張照片（上限 {MAX_PHOTOS} 張）。要換的話先移除幾張。
      </p>
    );
  }

  return (
    <div style={{ marginTop: "0.8rem" }}>
      <PhotoTile slots={slots} onChange={setSlots} />

      <form method="post" action="/api/portal/amber/product/edit" style={{ marginTop: "0.6rem" }}>
        <input type="hidden" name="action" value="add-images" />
        <input type="hidden" name="id" value={productId} />
        <input
          type="hidden"
          name="imageIds"
          value={done.map((s) => s.result!.id).join(",")}
        />
        <button
          type="submit"
          className="p-btn"
          /* 還在傳的時候按下去會只接到已經傳完的那幾張，剩下的靜靜消失 */
          disabled={done.length === 0 || busy}
        >
          {busy
            ? "照片上傳中…"
            : done.length === 0
              ? "先選照片"
              : `加入這 ${done.length} 張照片`}
        </button>
      </form>
    </div>
  );
}
