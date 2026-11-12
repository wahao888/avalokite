/**
 * 逐幀渲染 reel.html 成 mp4（1080×1920、30fps）。
 *
 *   node render.js                 完整渲染，混上 audio.m4a
 *   node render.js --sfx           只把頁面裡的音效時間表存成 sfx.json（給 make-bgm.py）
 *   node render.js --shots 3,8.5   只截指定秒數的畫面到 frames/，檢查版面用
 *
 * 不用螢幕錄影：把動畫 seek 到 t = n/FPS 再截圖，每一幀都精準，機器跑多慢都不會掉幀。
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const FPS = 30;
const REEL = "file://" + path.join(__dirname, "..", "reel.html") + "?rec=1";
const AUDIO = path.join(__dirname, "audio.m4a");
const OUT = process.env.OUT || path.join(__dirname, "..", "avalo-handdrawn-reel.mp4");
const TL = JSON.parse(fs.readFileSync(path.join(__dirname, "timeline.json"), "utf8"));
const arg = (k) => { const i = process.argv.indexOf(k); return i < 0 ? null : (process.argv[i + 1] || true); };

/** Playwright 版本對應的瀏覽器沒下載時，退回快取裡現成的那一份，省掉一次 150MB 的下載 */
function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  try { const p = chromium.executablePath(); if (fs.existsSync(p)) return undefined; } catch (e) {}
  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  const dirs = fs.readdirSync(cache).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse();
  for (const d of dirs) {
    for (const sub of fs.readdirSync(path.join(cache, d))) {
      for (const bin of ["headless_shell", "chrome-headless-shell"]) {
        const p = path.join(cache, d, sub, bin);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  throw new Error("找不到可用的 Chromium，請先執行 npx playwright install chromium");
}

async function open() {
  const browser = await chromium.launch({ executablePath: findChromium() });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => { console.error("頁面錯誤：", e.message); process.exitCode = 1; });
  await page.goto(REEL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { fit(); pause(); });
  return { browser, page };
}

async function frame(page, t) {
  // 兩個 rAF：確保 seek 之後的樣式真的畫出來了才截圖
  await page.evaluate(async (t) => {
    seek(t); pause();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, t);
}

(async () => {
  const { browser, page } = await open();

  if (arg("--sfx")) {
    const sfx = await page.evaluate(() => window.SFX);
    fs.writeFileSync(path.join(__dirname, "sfx.json"), JSON.stringify(sfx, null, 1));
    console.log(`已寫出 sfx.json（${sfx.length} 個音效）`);
    return browser.close();
  }

  if (arg("--shots")) {
    const dir = path.join(__dirname, "frames"); fs.mkdirSync(dir, { recursive: true });
    for (const s of String(arg("--shots")).split(",")) {
      const t = Number(s);
      await frame(page, t);
      await page.screenshot({ path: path.join(dir, `t${t.toFixed(2).padStart(6, "0")}.png`) });
    }
    return browser.close();
  }

  const TOTAL = Math.round(FPS * TL.total);
  const ff = spawn("/opt/homebrew/bin/ffmpeg", [
    "-y",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-i", AUDIO,
    "-c:v", "libx264", "-preset", "slow", "-crf", "17",
    "-pix_fmt", "yuv420p",            // 少了這行，多數播放器與社群平台會拒收
    "-profile:v", "high", "-level", "4.2",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-c:a", "copy", "-shortest",
    "-movflags", "+faststart",        // 讓影片邊載邊播
    OUT,
  ], { stdio: ["pipe", "inherit", "pipe"] });
  let ffErr = "";
  ff.stderr.on("data", (d) => { ffErr += d.toString(); });

  for (let i = 0; i < TOTAL; i++) {
    await frame(page, i / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % 150 === 0) process.stderr.write(`  第 ${i}/${TOTAL} 幀\n`);
  }
  ff.stdin.end();
  await browser.close();
  const code = await new Promise((r) => ff.on("close", r));
  if (code !== 0) { process.stderr.write(ffErr.slice(-3000)); process.exit(1); }
  console.log(`完成：${OUT}`);
})();
