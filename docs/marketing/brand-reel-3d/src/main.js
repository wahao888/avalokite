// 進入點：建立渲染器與燈光、把 3D 劇本和 HTML 疊層（標題、字幕、片尾）綁在同一條時間軸上。
import { THREE } from "./kit.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildWorld } from "./world.js";
import { makeStory } from "./story.js";

const TL = window.TL, TOTAL = TL.total;
const stage = document.getElementById("stage"), canvas = document.getElementById("gl"), sky = document.getElementById("sky");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
// 環境光照：一個柔和的攝影棚，讓霧面材質有細微的反光層次，不會像塑膠
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.42;

const camera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.5, 200);
const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(-7.5, 13, 9.5); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); sun.shadow.camera.left = -9; sun.shadow.camera.right = 11; sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -8;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 45; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.035; sun.shadow.radius = 5;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xbfd8ff, 0.9); rim.position.set(8, 6, -10); scene.add(rim);   // 背光：把角色從背景裡勾出來

const W = buildWorld(scene);
const css = (c) => "#" + c.getHexString();
const story = makeStory(W, TL, {
  camera, sun, hemi,
  setSky: (top, bot) => { sky.style.background = `linear-gradient(180deg, ${css(top)} 0%, ${css(top.clone().lerp(bot, 0.55))} 46%, ${css(bot)} 78%, ${css(bot)} 100%)`; },
  setGrade: (sat, exp) => { canvas.style.filter = `saturate(${sat.toFixed(3)})`; renderer.toneMappingExposure = exp; },
});
window.SFX = story.sfx;

// ── HTML 疊層：標題、字幕、片尾 ──
const SC = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
const at = (id, v) => {
  const m = /^@(\w+)([+-][\d.]+)?$/.exec(String(v).trim());
  if (m) return SC[id].start + SC[id].cues[m[1]] + (m[2] ? +m[2] : 0);
  const e = /^end([+-][\d.]+)?$/.exec(String(v).trim());
  if (e) return SC[id].start + SC[id].dur + (e[1] ? +e[1] : 0);
  return SC[id].start + +v;
};
document.querySelectorAll("[data-scene]").forEach((box) => {
  const id = box.dataset.scene;
  box.querySelectorAll("[data-at]").forEach((el) => { el.style.animationDelay = at(id, el.dataset.at) + "s"; });
  box.querySelectorAll("[data-out]").forEach((el) => {
    el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-26px)" }],
      { delay: at(id, el.dataset.out) * 1000, duration: 320, fill: "forwards", easing: "ease-in" });
  });
});
const caps = document.getElementById("caps");
TL.captions.forEach((c, i) => {
  const el = document.createElement("div"); el.className = "cap";
  el.innerHTML = c.text.replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/~(.+?)~/g, '<em class="w">$1</em>');
  caps.appendChild(el);
  const nxt = TL.captions[i + 1], out = nxt ? Math.min(c.end, nxt.start) : c.end;
  el.animate([{ opacity: 0, transform: "translateY(16px) scale(.95)" }, { opacity: 1, transform: "none" }], { delay: c.start * 1000, duration: 140, fill: "forwards", easing: "ease-out" });
  el.animate([{ opacity: 1 }, { opacity: 0 }], { delay: out * 1000, duration: 1, fill: "forwards" });
});
// 片尾：3D 畫面退到後面變暗變模糊，把位置讓給標誌
const glWrap = document.getElementById("glwrap");
glWrap.animate([{ filter: "blur(0px) brightness(1)" }, { filter: "blur(14px) brightness(.5)" }], { delay: at("cta", "@brand-.5") * 1000, duration: 900, fill: "forwards", easing: "ease-in-out" });
// 開場從黑淡入
document.getElementById("fadein").animate([{ opacity: 1 }, { opacity: 0 }], { delay: 0, duration: 700, fill: "forwards" });

// ── 時間控制 ──
let cur = 0, playing = false, t0 = 0;
const anims = () => document.getAnimations();
function draw(t) { story.update(t); renderer.render(scene, camera); }
function seek(t) { cur = Math.max(0, Math.min(TOTAL, t)); anims().forEach((a) => { try { a.currentTime = cur * 1000; } catch (e) {} }); draw(cur); }
function pause() { playing = false; anims().forEach((a) => a.pause()); }
function play() { playing = true; t0 = performance.now() - cur * 1000; anims().forEach((a) => a.play()); }
function fit() {
  const rec = document.body.classList.contains("record");
  const s = Math.min(innerWidth / 1080, (innerHeight - (rec ? 0 : 52)) / 1920);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`;
}
Object.assign(window, { seek, pause, play, fit });
addEventListener("resize", fit); fit();

const aud = document.getElementById("aud"), fill = document.getElementById("fill"), clock = document.getElementById("clock");
function restart() { seek(0); play(); try { aud.currentTime = 0; aud.play().catch(() => {}); } catch (e) {} }
document.getElementById("replay").onclick = restart;
document.getElementById("rec").onclick = () => { document.body.classList.toggle("record"); fit(); restart(); };
document.getElementById("track").onclick = (e) => {
  const r = e.currentTarget.getBoundingClientRect(), t = ((e.clientX - r.left) / r.width) * TOTAL;
  seek(t); if (playing) play(); try { aud.currentTime = t; } catch (err) {}
};
const REC = new URLSearchParams(location.search).get("rec") === "1";
if (REC) document.body.classList.add("record");
(function tick() {
  if (playing) { cur = Math.min(TOTAL, (performance.now() - t0) / 1000); draw(cur); if (cur >= TOTAL) playing = false; }
  fill.style.width = (cur / TOTAL) * 100 + "%"; clock.textContent = cur.toFixed(1) + " / " + TOTAL.toFixed(1) + "s";
  requestAnimationFrame(tick);
})();

pause();
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => new Promise((r) => setTimeout(r, 300))).then(() => {
  fit(); seek(0); window.READY = true; if (!REC) restart();
});
