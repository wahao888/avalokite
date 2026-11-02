import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const sample = readFileSync("deploy/report-sample.tsv", "utf8");
function report(extra: string) {
  return execFileSync(process.execPath, ["deploy/report-render.js", "--text"], {
    input: `${sample}\ns3_avalo_db_age_h\t10\ns3_uploads_age_h\t10\n${extra}`,
    encoding: "utf8",
  });
}
describe("daily off-host backup monitoring", () => {
  it("accepts a fresh successful sync", () => {
    expect(report("")).not.toContain("離線備份已");
    expect(report("")).not.toContain("離線備份狀態無法確認");
  });
  it("flags missing and invalid evidence instead of treating it as zero", () => {
    expect(report("s3_uploads_age_h\tMISSING\n")).toContain("商品照片離線備份狀態無法確認");
    expect(report("s3_avalo_db_age_h\tERR\n")).toContain("資料庫離線備份狀態無法確認");
  });
  it("flags a sync older than 48 hours", () => {
    expect(report("s3_uploads_age_h\t49\n")).toContain("商品照片離線備份已 49 小時未成功");
  });
  it("nudges first-hand content on the first of the month", () => {
    expect(report("content_nudge\t1\n")).toContain("第一手指南");
  });
});

// 稽核結果（/api/cron/ops-audit）要能穿過 TSV 一路到信裡。
// 這段接的是 bash → TSV → 排版器三層，型別檢查完全幫不上忙。
describe("daily ops audit rows", () => {
  const row = (level: number, id: string, label: string, value: string, action: string) =>
    `audit\t${level}\t${id}\t${label}\t${value}\t${action}\n`;

  it("要處理的項目會進「今天需要你做的事」", () => {
    const out = report(row(2, "sub-pastdue", "扣款失敗欠費中", "AVL123（第 1 階段）", "先打一通電話"));
    expect(out).toContain("必做　扣款失敗欠費中：AVL123（第 1 階段）");
    expect(out).toContain("先打一通電話");
  });

  it("留意的項目標成留意，不會混進必做", () => {
    const out = report(row(1, "chat-handoff", "AI 客服等你回的對話", "2 筆", "到 /admin/chat 看"));
    expect(out).toContain("留意　AI 客服等你回的對話：2 筆");
  });

  it("正常的項目不佔待辦版面，但仍列在待辦與風險裡", () => {
    const out = report(row(0, "inquiry-open", "未處理的詢問單", "0 筆", "都回完了"));
    expect(out).not.toContain("留意　未處理的詢問單");
    expect(out).toMatch(/正常.*未處理的詢問單：0 筆/);
  });

  it("稽核沒跑成功要說出來——那幾項是空的，不是沒事", () => {
    expect(report("audit_error\tcurl\n")).toContain("營運稽核沒跑成功");
    expect(report("audit_error\tnosecret\n")).toContain("CRON_SECRET");
  });
});
