import { describe, it, expect } from "vitest";
import {
  PROMO_WINDOW,
  currentDeadline,
  isExpired,
  remainingFrom,
  rollingDeadline,
  seatsLeft,
} from "../src/lib/promo-window";

// 檔期有兩種模式，兩種都要守住「頁面上不會出現一個已經過期還在倒數的優惠」：
// 固定檔期靠 isExpired 讓畫面換成結束說明，開放式檔期靠滾動週期永遠不歸零。

const HOUR = 60 * 60 * 1000;
const period = PROMO_WINDOW.cycleHours * HOUR;

describe("固定檔期（currentDeadline / isExpired）", () => {
  const { endsAt } = PROMO_WINDOW;

  it("有設截止日時，倒數一律指向那一天", () => {
    if (endsAt === null) return;
    for (const t of [endsAt - 30 * 24 * HOUR, endsAt - 1, endsAt, endsAt + 1000]) {
      expect(currentDeadline(t)).toBe(endsAt);
    }
  });

  it("截止前不算過期，截止當下就算過期", () => {
    if (endsAt === null) return;
    expect(isExpired(endsAt - 1)).toBe(false);
    expect(isExpired(endsAt)).toBe(true);
    expect(isExpired(endsAt + 1000)).toBe(true);
  });

  it("過期後剩餘時間歸零，不會算出負數", () => {
    if (endsAt === null) return;
    expect(remainingFrom(endsAt + 5 * 24 * HOUR)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("截止日必須晚於倒數錨點（避免參數前後顛倒）", () => {
    if (endsAt === null) return;
    expect(endsAt).toBeGreaterThan(PROMO_WINDOW.anchor);
  });
});

describe("開放式檔期的滾動週期（rollingDeadline）", () => {
  it("任何時間點的截止時間都在未來", () => {
    const samples = [
      PROMO_WINDOW.anchor - 30 * 24 * HOUR,
      PROMO_WINDOW.anchor - 1,
      PROMO_WINDOW.anchor,
      PROMO_WINDOW.anchor + 1,
      PROMO_WINDOW.anchor + period - 1,
      PROMO_WINDOW.anchor + period,
      PROMO_WINDOW.anchor + 365 * 24 * HOUR,
      Date.now(),
    ];
    for (const t of samples) {
      expect(rollingDeadline(t), `t=${new Date(t).toISOString()}`).toBeGreaterThan(t);
    }
  });

  it("剩餘時間不超過一個週期", () => {
    for (let i = 0; i < 50; i++) {
      const t = PROMO_WINDOW.anchor + Math.floor(Math.random() * 200 * 24 * HOUR);
      expect(rollingDeadline(t) - t).toBeLessThanOrEqual(period);
    }
  });

  it("歸零的下一刻自動滾到下一輪，不會停在 0", () => {
    const boundary = PROMO_WINDOW.anchor + period;
    expect(rollingDeadline(boundary - 1)).toBe(boundary);
    expect(rollingDeadline(boundary)).toBe(boundary + period);
    expect(rollingDeadline(boundary + 1000)).toBe(boundary + period);
  });

  it("截止時間都落在週期的整數倍上（人工調參數不會歪掉）", () => {
    for (const t of [PROMO_WINDOW.anchor + 5 * HOUR, PROMO_WINDOW.anchor + 500 * HOUR]) {
      expect((rollingDeadline(t) - PROMO_WINDOW.anchor) % period).toBe(0);
    }
  });
});

describe("剩餘時間拆解（remainingFrom）", () => {
  it("各單位都在合理範圍內", () => {
    for (let i = 0; i < 50; i++) {
      const t = PROMO_WINDOW.anchor + Math.floor(Math.random() * 200 * 24 * HOUR);
      const r = remainingFrom(t);
      expect(r.days).toBeGreaterThanOrEqual(0);
      expect(r.hours).toBeGreaterThanOrEqual(0);
      expect(r.hours).toBeLessThan(24);
      expect(r.minutes).toBeLessThan(60);
      expect(r.seconds).toBeLessThan(60);
    }
  });

  it("整點對齊時算出的是整數天", () => {
    const base = PROMO_WINDOW.endsAt ?? PROMO_WINDOW.anchor + period;
    expect(remainingFrom(base - 2 * 24 * HOUR)).toEqual({
      days: 2,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});

describe("名額設定", () => {
  it("已認購不超過總席次，剩餘席次不為負", () => {
    expect(PROMO_WINDOW.seatsTaken).toBeLessThanOrEqual(PROMO_WINDOW.seatsTotal);
    expect(PROMO_WINDOW.seatsTaken).toBeGreaterThanOrEqual(0);
    expect(seatsLeft()).toBe(PROMO_WINDOW.seatsTotal - PROMO_WINDOW.seatsTaken);
  });

  it("週期至少一小時（避免倒數快到看不出來）", () => {
    expect(PROMO_WINDOW.cycleHours).toBeGreaterThanOrEqual(1);
  });
});
