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
});
