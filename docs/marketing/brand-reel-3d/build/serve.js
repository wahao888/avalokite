/**
 * 這支短片的靜態伺服器。
 *
 * 為什麼需要：three.js 是 ES module，瀏覽器不允許 file:// 的頁面載入模組，
 * 所以 reel.html 不能像上一支那樣直接雙擊打開。
 *
 *   node build/serve.js          → http://localhost:4173/reel.html
 *
 * /three/ 對應到專案根目錄的 node_modules/three（官網本來就裝了，不另外裝一份）。
 */
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const THREE_DIR = path.join(__dirname, "..", "..", "..", "..", "node_modules", "three");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".m4a": "audio/mp4", ".mp4": "video/mp4", ".png": "image/png", ".wav": "audio/wav" };

function start(port = 0) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const base = url.startsWith("/three/") ? THREE_DIR : ROOT;
    const file = path.normalize(path.join(base, url.startsWith("/three/") ? url.slice(7) : url));
    if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }        // 不讓路徑跳出資料夾
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(buf);
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}
module.exports = { start };
if (require.main === module) start(Number(process.env.PORT) || 4173).then(({ port }) => console.log(`http://localhost:${port}/reel.html`));
