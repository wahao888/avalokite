import { describe, it, expect } from "vitest";
import {
  DUNNING_STAGES,
  MAX_DUNNING_STAGE,
  daysUntilSuspension,
  dueDunningStage,
} from "../src/lib/dunning";

// 這些數字決定客戶第幾天會被關站，錯了不會有人立刻發現。

describe("催收階段判斷（dueDunningStage）", () => {
  it("門檻未到就不寄", () => {
    expect(dueDunningStage(0, 0)).toBe(0);
    expect(dueDunningStage(2, 0)).toBe(0);
  });

  it("到門檻當天推進該階", () => {
    expect(dueDunningStage(3, 0)).toBe(1);
    expect(dueDunningStage(7, 1)).toBe(2);
    expect(dueDunningStage(15, 2)).toBe(3);
    expect(dueDunningStage(30, 3)).toBe(4);
  });

  it("同一階不重複寄（cron 每天跑，這是最常發生的情況）", () => {
    expect(dueDunningStage(5, 1)).toBe(0);
    expect(dueDunningStage(14, 2)).toBe(0);
    expect(dueDunningStage(29, 3)).toBe(0);
  });

  it("cron 漏跑數日後只補最新的一階，不連寄過期文案", () => {
    // 停機到第 20 天才恢復：該送的是「已暫停」，不是「7 天後將暫停」
    expect(dueDunningStage(20, 0)).toBe(3);
    expect(dueDunningStage(40, 1)).toBe(4);
  });

  it("走完最後一階就不再推進", () => {
    expect(dueDunningStage(60, MAX_DUNNING_STAGE)).toBe(0);
  });
});

describe("暫停倒數（daysUntilSuspension）", () => {
  it("預告信寫得出剩幾天，且不會出現負數", () => {
    expect(daysUntilSuspension(7)).toBe(8);
    expect(daysUntilSuspension(14)).toBe(1);
    expect(daysUntilSuspension(15)).toBe(0);
    expect(daysUntilSuspension(40)).toBe(0);
  });
});

describe("時程表本身", () => {
  it("階段連號、天數遞增（門檻寫反會讓催收永遠停在第一階）", () => {
    DUNNING_STAGES.forEach((s, i) => {
      expect(s.stage).toBe(i + 1);
      if (i > 0) expect(s.day).toBeGreaterThan(DUNNING_STAGES[i - 1].day);
    });
  });

  it("暫停與終止的門檻與服務條款第九條一致（15 日／30 日）", () => {
    expect(DUNNING_STAGES.find((s) => s.stage === 3)!.day).toBe(15);
    expect(DUNNING_STAGES.find((s) => s.stage === 4)!.day).toBe(30);
  });
});
