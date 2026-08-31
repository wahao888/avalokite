import { describe, it, expect } from "vitest";
import { PROMO_WINDOW, currentDeadline, remainingFrom, seatsLeft } from "../src/lib/promo-window";

// 限時檔期的倒數是滾動的：這裡守的是「頁面上永遠不會出現一個已經過期的優惠」，
// 因為那比沒有倒數更傷信任。

const HOUR = 60 * 60 * 1000;
const period = PROMO_WINDOW.cycleHours * HOUR;

describe("倒數週期（currentDeadline）", () => {
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
      expect(currentDeadline(t), `t=${new Date(t).toISOString()}`).toBeGreaterThan(t);
    }
  });

  it("剩餘時間不超過一個週期", () => {
    for (let i = 0; i < 50; i++) {
      const t = PROMO_WINDOW.anchor + Math.floor(Math.random() * 200 * 24 * HOUR);
      expect(currentDeadline(t) - t).toBeLessThanOrEqual(period);
    }
  });

  it("歸零的下一刻自動滾到下一輪，不會停在 0", () => {
    const boundary = PROMO_WINDOW.anchor + period;
    expect(currentDeadline(boundary - 1)).toBe(boundary);
    expect(currentDeadline(boundary)).toBe(boundary + period);
    expect(currentDeadline(boundary + 1000)).toBe(boundary + period);
  });

  it("截止時間都落在週期的整數倍上（人工調參數不會歪掉）", () => {
    for (const t of [PROMO_WINDOW.anchor + 5 * HOUR, PROMO_WINDOW.anchor + 500 * HOUR]) {
      expect((currentDeadline(t) - PROMO_WINDOW.anchor) % period).toBe(0);
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
    expect(remainingFrom(PROMO_WINDOW.anchor)).toEqual({
      days: PROMO_WINDOW.cycleHours / 24,
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
