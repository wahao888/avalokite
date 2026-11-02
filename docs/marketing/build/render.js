/**
 * 逐幀渲染 promo-reel.html 成 mp4。
 *
 * 不用 Playwright 的錄影功能（那只會輸出無聲 webm，而且是即時錄、會掉幀）：
 * 這裡改成把動畫 seek 到 t = n/FPS 再截圖，每一幀都是精準的，跑多慢都不影響成品。
 * PNG 直接餵進 ffmpeg 的 stdin，不落地，省掉上千個檔案。
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

const FPS = 30;
const DUR = 38.6;
const REEL = "file://" + path.join(__dirname, "..", "promo-reel.html") + "?rec=1";
const AUDIO = path.join(__dirname, "audio.m4a");
const OUT = process.env.OUT || path.join(__dirname, "..", "promo-reel.mp4");
const TOTAL = process.env.FRAMES ? Number(process.env.FRAMES) : Math.round(FPS * DUR);

(async () => {
  const ff = spawn("/opt/homebrew/bin/ffmpeg", [
    "-y",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-i", AUDIO,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p",            // 少了這行，多數播放器與社群平台會拒收
    "-profile:v", "high", "-level", "4.2",
    "-c:a", "copy", "-shortest",
    "-movflags", "+faststart",        // 讓影片邊載邊播
    OUT,
  ], { stdio: ["pipe", "inherit", "pipe"] });

  let ffErr = "";
  ff.stderr.on("data", (d) => { ffErr += d.toString(); });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(REEL, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.evaluate(() => { fit(); pause(); });

  for (let i = 0; i < TOTAL; i++) {
    // 兩個 rAF：確保 seek 之後的樣式真的畫出來了才截圖
    await page.evaluate(async (t) => {
      seek(t); pause();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, i / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 120 === 0) process.stderr.write(`  第 ${i}/${TOTAL} 幀\n`);
  }

  ff.stdin.end();
  await browser.close();
  const code = await new Promise((r) => ff.on("close", r));
  if (code !== 0) { process.stderr.write(ffErr.slice(-3000)); process.exit(1); }
  console.log(`完成：${OUT}`);
})();
