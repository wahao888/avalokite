"use client";

import { useCallback, useRef, useState } from "react";
import { CompressError, UPLOAD_CONCURRENCY, uploadPhoto, type UploadResult } from "./compress";

// 上架表單的照片區。
//
// 這個元件的整個設計目標是「跟她打字並行」：選完照片立刻開始壓縮與上傳，
// 她接著花 15 秒打品名的同時，三張圖已經傳完了。這個重疊就是 30 秒預算的大半。
//
// 失敗處理的原則是**絕不丟掉她的工作**。她站在韓國的店裡用 4G，
// 逾時與 502 是常態；每一張都可以單獨重試，重試沿用同一個 uploadId
// （伺服器據此冪等），所以「其實成功了但逾時」不會變成兩張重複的圖。

export type PhotoSlot = {
  /** 客戶端產生的冪等鍵。重試時沿用同一個 */
  uploadId: string;
  file: File;
  /** 本機預覽用的 object URL */
  previewUrl: string;
  status: "pending" | "working" | "done" | "error";
  result?: UploadResult;
  errorMessage?: string;
};

export const MAX_PHOTOS = 8;

export function PhotoTile({
  slots,
  onChange,
  disabled,
}: {
  slots: PhotoSlot[];
  onChange: (next: PhotoSlot[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // 用 ref 保存最新的 slots，讓非同步的上傳回呼不會蓋掉同時發生的其他更新
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const patch = useCallback(
    (uploadId: string, next: Partial<PhotoSlot>) => {
      const updated = slotsRef.current.map((s) =>
        s.uploadId === uploadId ? { ...s, ...next } : s,
      );
      slotsRef.current = updated;
      onChange(updated);
    },
    [onChange],
  );

  const runOne = useCallback(
    async (slot: PhotoSlot) => {
      patch(slot.uploadId, { status: "working", errorMessage: undefined });
      try {
        const result = await uploadPhoto(slot.file, { uploadId: slot.uploadId });
        patch(slot.uploadId, { status: "done", result });
      } catch (e) {
        patch(slot.uploadId, {
          status: "error",
          errorMessage:
            e instanceof CompressError ? e.userMessage : "上傳失敗，請點一下重試。",
        });
      }
    },
    [patch],
  );

  /** 併發度 2：t3.micro 上 sharp 一張約 30MB 工作集，五張並行會很緊 */
  const runQueue = useCallback(
    async (queue: PhotoSlot[]) => {
      let i = 0;
      await Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, async () => {
          while (i < queue.length) await runOne(queue[i++]);
        }),
      );
    },
    [runOne],
  );

  const onPick = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const room = MAX_PHOTOS - slotsRef.current.length;
      const picked = Array.from(files).slice(0, Math.max(0, room));

      const added: PhotoSlot[] = picked.map((file) => ({
        uploadId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
      }));

      const next = [...slotsRef.current, ...added];
      slotsRef.current = next;
      onChange(next);
      // 立刻開始傳，不等她按任何按鈕
      void runQueue(added);

      // 清掉 input 的值，否則她再選同一張照片不會觸發 change
      if (inputRef.current) inputRef.current.value = "";
    },
    [onChange, runQueue],
  );

  const remove = useCallback(
    (uploadId: string) => {
      const target = slotsRef.current.find((s) => s.uploadId === uploadId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      const next = slotsRef.current.filter((s) => s.uploadId !== uploadId);
      slotsRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  const pending = slots.filter((s) => s.status === "working" || s.status === "pending").length;
  const failed = slots.filter((s) => s.status === "error");

  return (
    <div className="p-dg-photos">
      <div className="p-dg-photogrid">
        {slots.map((s) => (
          <div key={s.uploadId} className={`p-dg-photo p-dg-photo--${s.status}`}>
            {/* 預覽用的是本機 object URL，不必等上傳完成就看得到 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.previewUrl} alt="" width={120} height={120} />

            {s.status !== "done" && (
              <span className="p-dg-photo__badge">
                {s.status === "error" ? "失敗" : "傳送中"}
              </span>
            )}

            <div className="p-dg-photo__actions">
              {s.status === "error" && (
                <button type="button" onClick={() => void runOne(s)}>
                  重試
                </button>
              )}
              <button type="button" onClick={() => remove(s.uploadId)} aria-label="移除這張照片">
                ✕
              </button>
            </div>
          </div>
        ))}

        {slots.length < MAX_PHOTOS && (
          <button
            type="button"
            className="p-dg-photo p-dg-photo--add"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <span aria-hidden>＋</span>
            <span>加照片</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        // accept="image/*" 會讓 iOS 的照片選擇器傾向自己把 HEIC 轉成 JPEG；
        // 明列 heic/heif 是雙保險，真的拿到原始 HEIC 時前端 canvas 也解得掉。
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        hidden
        onChange={(e) => onPick(e.target.files)}
      />

      {pending > 0 && <p className="p-dg-hint">照片上傳中（{pending}）——可以先繼續打商品名稱</p>}
      {failed.length > 0 && (
        <p className="p-dg-error">{failed[0].errorMessage ?? "有照片上傳失敗，請點「重試」。"}</p>
      )}
    </div>
  );
}

/** 送出時要帶給後端的圖片 id。只取已經傳完的 */
export const uploadedImageIds = (slots: PhotoSlot[]): string[] =>
  slots.filter((s) => s.status === "done" && s.result).map((s) => s.result!.id);

/** 還有照片在傳的時候不該讓她按上架——那會送出一件沒有圖的商品 */
export const hasPendingUploads = (slots: PhotoSlot[]): boolean =>
  slots.some((s) => s.status === "pending" || s.status === "working");
