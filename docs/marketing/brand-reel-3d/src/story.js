// 劇本：每一格畫面都是時間 t 的純函數。
// 沒有任何「累加的狀態」——所以可以任意跳到第幾秒渲染那一格，逐幀輸出才不會走樣。
import { THREE, C, lerp, clamp01, smooth, inOut, outCubic, outBack, outElastic, outBounce, prog, pop, rnd, setScale, setSprite, pose, along } from "./kit.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const col = (h) => new THREE.Color(h);

// 光線與天色。sat 是整個畫面的飽和度：故事開頭刻意是灰的，阿瓦羅來了顏色才回來
const MOODS = {
  gloomy:  { top: col(0x77828f), bot: col(0xb4bbc2), sun: col(0xc9d2e2), sunI: 1.5, hemiS: col(0xb9c3d2), hemiG: col(0x70736f), hemiI: 1.25, sat: 0.42, night: 0, exp: 0.92 },
  sunrise: { top: col(0x7fbbe6), bot: col(0xffe3c4), sun: col(0xffdcae), sunI: 3.3, hemiS: col(0xcfe6fb), hemiG: col(0xb89a7a), hemiI: 1.25, sat: 1.06, night: 0, exp: 1.05 },
  day:     { top: col(0x6db8ee), bot: col(0xe4f3fb), sun: col(0xfff2da), sunI: 3.4, hemiS: col(0xcfe8ff), hemiG: col(0xa7b58f), hemiI: 1.3, sat: 1.1, night: 0, exp: 1.05 },
  night:   { top: col(0x0d1230), bot: col(0x34406f), sun: col(0x8ea4ff), sunI: 1.25, hemiS: col(0x4a5a9c), hemiG: col(0x232845), hemiI: 1.0, sat: 1.0, night: 1, exp: 1.0 },
  golden:  { top: col(0x64aee6), bot: col(0xffd9a6), sun: col(0xffd39a), sunI: 3.5, hemiS: col(0xd6e9fb), hemiG: col(0xc2a078), hemiI: 1.3, sat: 1.12, night: 0, exp: 1.06 },
};
function mixMood(a, b, u) {
  const o = {};
  for (const k in a) o[k] = a[k].isColor ? a[k].clone().lerp(b[k], u) : lerp(a[k], b[k], u);
  return o;
}

export function makeStory(W, TL, rig) {
  const { camera, sun, hemi, setSky, setGrade } = rig;
  const SC = Object.fromEntries(TL.scenes.map((s) => [s.id, s]));
  const T = (id, cue, off = 0) => SC[id].start + (cue ? SC[id].cues[cue] : 0) + off;
  const TOTAL = TL.total;

  // ── 鏡頭：每一幕一組「起點→終點」，幕與幕之間用一秒滑過去，全片沒有硬切 ──
  const CAM = {
    lonely:  [[0.2, 6.2, 22], [0.4, 4.6, 16.5], [0.3, 1.0, 0.4]],
    arrive:  [[2.4, 6.0, 27], [1.2, 6.2, 25.5], [-0.6, 2.9, 0]],
    website: [[-8.4, 5.0, 17.2], [-7.2, 4.7, 15.8], [-2.25, 2.25, 1.0]],
    shop:    [[8.8, 5.4, 18], [7.8, 5.0, 16.6], [2.6, 1.55, 0.8]],
    ai:      [[-4.4, 3.8, 16.2], [-3.7, 3.6, 15.2], [-0.85, 1.75, 1.9]],
    auto:    [[5.2, 3.8, 15.2], [4.5, 3.5, 14.2], [1.75, 1.3, 2.6]],
    geo:     [[9.6, 8.2, 27], [8.4, 7.6, 25.4], [2.5, 2.9, 0.2]],
    care:    [[1.5, 9.2, 30], [-1.0, 8.6, 29], [0, 2.3, 0]],
    finale:  null,                                   // 繞著島轉，下面另外算
    cta:     [[0, 9.5, 34], [0, 11.5, 40], [0, 5.2, 0]],
  };
  const order = TL.scenes.map((s) => s.id);
  function camOf(id, t) {
    const s = SC[id], u = clamp01((t - s.start) / s.dur * 1.0);
    if (id === "finale") {
      const a = lerp(-0.42, 0.42, inOut(clamp01((t - s.start) / s.dur))), r = 28;
      return { p: V(Math.sin(a) * r, 7.4, Math.cos(a) * r), q: V(0, 2.0, 0) };
    }
    const [A, B, Q] = CAM[id];
    const e = outCubic(u) * 0.7 + u * 0.3;        // 進場快、之後慢慢漂
    return { p: V(lerp(A[0], B[0], e), lerp(A[1], B[1], e), lerp(A[2], B[2], e)), q: V(...Q) };
  }
  function cameraAt(t) {
    let i = 0;
    while (i + 1 < order.length && t >= SC[order[i + 1]].start - 0.3) i++;
    let c = camOf(order[i], t);
    if (i > 0) {
      const w = inOut(prog(t, SC[order[i]].start - 0.3, 1.25));
      if (w < 1) { const pc = camOf(order[i - 1], t); c = { p: pc.p.lerp(c.p, w), q: pc.q.lerp(c.q, w) }; }
    }
    return c;
  }

  // ── 天色的轉折點 ──
  const moodKeys = [
    [T("arrive", "oneday", 0.2), 1.7, MOODS.sunrise],
    [T("website") - 0.2, 1.2, MOODS.day],
    [T("ai") - 0.3, 1.3, MOODS.night],
    [T("auto") - 0.3, 1.3, MOODS.day],
    [T("finale") - 0.2, 1.8, MOODS.golden],
  ];
  function moodAt(t) {
    let m = MOODS.gloomy;
    for (const [t0, d, target] of moodKeys) { const u = smooth(prog(t, t0, d)); if (u > 0) m = mixMood(m, target, u); }
    return m;
  }

  // ── 角色的走位：一串「幾秒開始、花多久、走到哪、面向哪」 ──
  function track(keys, t) {
    let p = keys[0].p.slice(), ry = keys[0].ry ?? 0, moving = 0, phase = 0;
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i], raw = prog(t, k.t, k.d), u = smooth(raw);
      if (raw <= 0) break;
      const from = p.slice();
      p = [lerp(from[0], k.p[0], u), lerp(from[1], k.p[1], u), lerp(from[2], k.p[2], u)];
      if (raw < 1) { moving = 1; phase = raw * k.d * 9; ry = Math.atan2(k.p[0] - from[0], k.p[2] - from[2]); }
      else ry = k.ry ?? ry;
    }
    return { p, ry, moving, phase };
  }
  const tA = T("arrive"), tW = T("website"), tS = T("shop"), tAI = T("ai"), tAU = T("auto"), tG = T("geo"), tC = T("care"), tF = T("finale"), tE = T("cta");
  const ownerKeys = [
    { p: [0.75, 0, 2.25], ry: 0 },
    { t: tW + 0.1, d: 1.1, p: [-1.3, 0, 2.25], ry: -0.35 },
    { t: tS + 0.1, d: 1.2, p: [0.95, 0, 2.2], ry: 0.55 },
    { t: tAI - 0.2, d: 1.0, p: [0.62, 0.2, 0.72], ry: 0 },
    { t: tAU - 0.1, d: 1.1, p: [0.62, 0, 2.95], ry: 0.75 },
    { t: tG + 0.2, d: 1.0, p: [0.35, 0, 2.45], ry: 0.7 },
    { t: tF + 0.1, d: 1.0, p: [0, 0, 2.7], ry: 0 },
  ];
  const BAL = [-2.45, 5.7, -2.3];                       // 熱氣球停泊的位置
  const tJump = (i) => T("arrive", "came", -0.1 + i * 0.2);
  const land = [[-1.55, 0, 2.5], [0.05, 0, 3.15], [2.0, 0, 2.5]];
  const crewKeys = [
    [{ p: land[0], ry: 0.2 }, { t: tW, d: 0.9, p: [-2.45, 0, 2.3], ry: -0.4 }, { t: tAI, d: 1.0, p: [-3.05, 0, 2.0], ry: 0.7 }, { t: tG, d: 1.2, p: [-2.6, 0, 2.3], ry: 0.5 }, { t: tF, d: 1.0, p: [-1.45, 0, 3.0], ry: 0.15 }],
    [{ p: land[1], ry: 0 }, { t: tS, d: 1.0, p: [1.5, 0, 1.05], ry: 0.6 }, { t: tAU, d: 1.0, p: [3.35, 0, 1.75], ry: -0.7 }, { t: tF, d: 1.0, p: [1.45, 0, 3.0], ry: -0.15 }],
    [{ p: land[2], ry: -0.2 }, { t: tW, d: 0.9, p: [2.9, 0, 2.2], ry: -0.4 }, { t: tS, d: 0.9, p: [3.85, 0, -0.15], ry: 0.3 }, { t: tG, d: 1.1, p: [3.75, 0, 1.85], ry: 1.1 }, { t: tC, d: 1.2, p: [-0.85, 0, 3.15], ry: 0 }, { t: tF, d: 1.0, p: [2.75, 0, 2.2], ry: -0.4 }],
  ];
  const dest = [[-0.75, 0, 0.55], [0.3, 0, 1.45], [1.35, 0, 0.75], [-1.2, 0, 1.25], [2.95, 0, 2.55], [-0.35, 0, 2.0]];
  const visStart = (i) => T("geo", "google", 0.9 + i * 0.75);
  const VIS_D = 3.4;

  // ── 火花：東西冒出來的那一下 ──
  const bursts = [];
  const burst = (t, p, n = 10, r = 1) => bursts.push({ t, p, n, r });
  // ── 音效時間表（make-bgm.py 讀這份） ──
  const sfx = [];
  const fx = (name, t) => sfx.push({ t: +t.toFixed(3), name });

  W.site.updateMatrixWorld(true); W.cart.updateMatrixWorld(true); W.pos.updateMatrixWorld(true); W.mach.updateMatrixWorld(true); W.kiosk.updateMatrixWorld(true);
  const btnWorld = W.site.localToWorld(V(-0.4, 3.04, 0.12));
  const funnelWorld = W.mach.localToWorld(V(-0.3, 1.5, 0));
  const termWorld = W.pos.localToWorld(V(0, 1.45, 0.1));
  const cartSlots = [[-0.24, 0.66, 0.06], [0.2, 0.63, -0.04], [-0.02, 0.98, 0.02]].map((p) => W.cart.localToWorld(V(...p)));

  // 事件：畫面、火花、音效共用同一個時間點
  fx("wind", 0.3); fx("sigh", T("lonely", "nobody", 0.5));
  fx("swell", T("arrive", "oneday")); 
  [0, 1, 2].forEach((i) => { burst(tJump(i) + 0.62, V(...land[i]).setY(0.15), 8, 0.8); fx("land", tJump(i) + 0.62); });
  fx("sparkle", T("arrive", "came", 0.9));
  burst(T("website", "build", 0.25), V(-2.75, 2.4, 0.9), 14, 1.4); fx("build", T("website", "build", 0.0)); fx("pop", T("website", "build", 0.75));
  fx("click", T("website", "site", 0.05)); fx("sparkle", T("website", "site", 0.2)); burst(T("website", "site", 0.1), btnWorld, 10, 0.8);
  fx("roll", T("shop", "cart", -0.45)); burst(T("shop", "cart", 0.15), V(2.35, 0.5, 1.5), 8, 0.9);
  fx("pop", T("shop", "pay", -0.2)); fx("beep", T("shop", "pay", 0.45)); fx("coins", T("shop", "pay", 0.55));
  [0, 1, 2].forEach((i) => { fx("thud", T("shop", "order", i * 0.3 + 0.42)); fx("ding", T("shop", "order", 0.25 + i * 0.3)); });
  fx("night", tAI - 0.2); fx("pop", tAI + 0.25); burst(tAI + 0.3, V(-1.75, 1.0, 2.7), 10, 1);
  const chatT = [T("ai", "ask"), T("ai", "reply"), T("ai", "reply", 0.85), T("ai", "reply", 1.35)];
  chatT.forEach((t, i) => fx(i % 2 ? "reply" : "msg", t));
  fx("pop", tAU + 0.25); burst(tAU + 0.3, V(1.95, 1.0, 2.8), 12, 1.1);
  const paperT = [T("auto", "report"), T("auto", "notify"), T("auto", "flow"), T("auto", "flow", 0.5)];
  paperT.forEach((t) => fx("paper", t)); fx("bell", T("auto", "notify", 0.25)); fx("gears", T("auto", "flow", 0.2));
  [0, 1, 2].forEach((i) => fx("tick", T("auto", "run", 0.1 + i * 0.18))); fx("ding", T("auto", "run", 0.85));
  fx("drop", T("geo", "google", -0.3)); fx("land", T("geo", "google", 0.25)); burst(T("geo", "google", 0.25), V(0, 3.3, -1), 14, 1.4); fx("pop", T("geo", "google", 0.45));
  for (let i = 0; i < 9; i++) fx("plank", T("geo", "google", 0.5 + i * 0.09));
  fx("sparkle", T("geo", "aiRead", 0.1));
  fx("shield", T("care", "live", -0.15)); fx("ding", T("care", "year", 0.05)); burst(T("care", "year", 0.1), V(2.7, 5.9, 0.6), 12, 1.6);
  fx("cheer", T("finale", "team", -0.4)); fx("stamp", T("finale", "fixed", 0.1));
  fx("logo", T("cta", "brand", -0.2)); fx("hit", T("cta", "rest", 1.1));
  sfx.sort((a, b) => a.t - b.t);

  const dummy = new THREE.Object3D();
  const tmp = new THREE.Vector3();

  function update(t) {
    // ── 鏡頭與光 ──
    const c = cameraAt(t);
    camera.position.copy(c.p); camera.lookAt(c.q);
    const m = moodAt(t);
    sun.color.copy(m.sun); sun.intensity = m.sunI; hemi.color.copy(m.hemiS); hemi.groundColor.copy(m.hemiG); hemi.intensity = m.hemiI;
    setSky(m.top, m.bot); setGrade(m.sat, m.exp);
    const night = m.night;
    W.stars.material.opacity = night * (0.75 + 0.25 * Math.sin(t * 3)); W.moonMat.opacity = night;
    W.cloudMat.emissiveIntensity = lerp(0.2, 0.03, night); W.cloudMat.color.setHex(0xffffff).lerp(col(0x7f8fc4), night * 0.75);
    W.bulb.emissiveIntensity = night * 3; W.lampLight.intensity = night * 26;
    const lively = smooth(prog(t, T("arrive", "came", 0.3), 1.0));
    W.glass.emissiveIntensity = lerp(0, 0.35, smooth(prog(t, T("website", "build", 0.6), 0.5))) + night * 1.6;
    W.clouds.forEach((cl, i) => { cl.position.x = cl.userData.x + Math.sin(t * 0.07 + i) * 0.9 + t * 0.012 * (i % 2 ? 1 : -1); });

    // ── 小店：招牌、遮陽棚、花、煙 ──
    const fixed = outElastic(prog(t, T("website", "build", 0.55), 0.9));
    W.sign.rotation.z = lerp(-0.2 + Math.sin(t * 1.6) * 0.035, 0, fixed);
    W.sign.position.y = 2.02 + Math.sin(prog(t, T("website", "build", 0.55), 0.4) * Math.PI) * 0.12;
    W.awning.rotation.x = lerp(1.5, 0.42, outBack(prog(t, T("website", "build", 0.85), 0.6)));
    W.flowers.forEach((f, i) => setScale(f, pop(t, T("arrive", "came", 0.5 + i * 0.07), 0.5)));
    W.trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * 1.1 + i * 1.7) * 0.025; });
    const smokeOn = smooth(prog(t, tW + 1.5, 1));
    W.smoke.forEach((p, i) => {
      const u = ((t * 0.3 + i / W.smoke.length) % 1);
      p.position.set(0.95 + Math.sin(u * 5 + i) * 0.18 + u * 0.5, 3.3 + u * 2.2, -1.5);
      setScale(p, smokeOn * (0.5 + u * 1.4)); p.material.opacity = smokeOn * (1 - u) * 0.7;
    });
    // 風滾草只在開頭滾過去
    const tu = prog(t, 0.2, 5.6);
    W.tumble.position.set(lerp(-5.2, 5.4, tu), 0.24 + Math.abs(Math.sin(tu * 9)) * 0.28, 3.3);
    W.tumble.rotation.z = -tu * 16; W.tumble.rotation.x = tu * 3;
    setScale(W.tumble, 1 - smooth(prog(t, tA + 0.2, 0.5)));

    // ── 熱氣球 ──
    const down = outCubic(prog(t, T("arrive", "oneday", -0.3), 1.9));
    const leave = 0;
    W.balloon.position.set(BAL[0] + Math.sin(t * 0.5) * 0.12, lerp(19, BAL[1], down) + Math.sin(t * 0.9) * 0.12 + leave, BAL[2]);
    W.balloon.rotation.z = Math.sin(t * 0.7) * 0.035; W.balloon.rotation.y = Math.sin(t * 0.25) * 0.25;
    W.balloon.visible = t > T("arrive", "oneday", -0.4);

    // ── 阿福 ──
    const ok = track(ownerKeys, t);
    const o = W.owner; o.position.set(...ok.p); o.rotation.y = ok.ry;
    const asleep = t > tAI + 0.9 && t < tAU - 0.15;
    const happy = smooth(prog(t, T("arrive", "came", 0.2), 0.5));
    const surprise = Math.sin(prog(t, T("arrive", "came", -0.05), 0.5) * Math.PI);
    const cheerO = Math.max(
      Math.sin(prog(t, T("website", "site", 0.15), 1.6) * Math.PI), Math.sin(prog(t, T("shop", "order", 0.3), 1.9) * Math.PI),
      Math.sin(prog(t, T("auto", "run", 0.5), 1.6) * Math.PI), smooth(prog(t, T("finale", "team", -0.5), 0.5)));
    const waveO = t > T("geo", "aiRead", -0.6) && t < tC + 0.5 ? 1 : 0;
    const lookUp = -0.35 * Math.max(Math.sin(prog(t, T("arrive", "oneday"), 2.6) * Math.PI), Math.sin(prog(t, T("care", "live"), 3.2) * Math.PI), Math.sin(prog(t, tW + 1.2, tS - tW - 1.2) * Math.PI));
    const hopO = ok.moving ? Math.abs(Math.sin(ok.phase)) * 0.2 : surprise * 0.45 + (cheerO > 0.05 ? Math.abs(Math.sin(t * 7.5)) * 0.22 * cheerO : 0);
    pose(o, t, {
      hop: hopO, squash: asleep ? 1 + Math.sin(t * 1.6) * 0.03 : 1 + (ok.moving ? Math.sin(ok.phase * 2) * 0.05 : Math.sin(t * 2.2) * 0.012 * (1 - happy) - 0.04 * (1 - happy)),
      mood: asleep ? 0.6 : lerp(-1, 1, happy), cheer: cheerO, wave: waveO, walk: ok.moving ? ok.phase : null, sleep: asleep, nod: lookUp,
      look: t > tW + 1.2 && t < tS ? -0.5 : 0,
    });

    // ── 阿瓦羅團隊 ──
    W.crew.forEach((cr, i) => {
      const tj = tJump(i), ju = prog(t, tj, 0.62);
      cr.visible = t >= tj;
      if (ju < 1) {                       // 從熱氣球的籃子跳下來
        const e = ju, L = land[i];
        cr.position.set(lerp(BAL[0], L[0], e), lerp(BAL[1] + 0.2, L[1], e * e) + Math.sin(e * Math.PI) * 1.4, lerp(BAL[2], L[2], e));
        cr.rotation.y = e * Math.PI * 2;
        pose(cr, t, { cheer: 1, mood: 1 });
        return;
      }
      const k = track(crewKeys[i], t);
      cr.position.set(...k.p); cr.rotation.y = k.ry;
      const landSq = 1 - Math.sin(prog(t, tj + 0.62, 0.35) * Math.PI) * 0.28;
      // 各自的「工作中」：在自己負責的那一幕邊跳邊揮手
      const busy = [[tW + 0.9, tS], [tS + 0.9, tAI], [tG + 1.0, tF]][i];
      const working = t > busy[0] && t < busy[1] ? 1 : 0;
      const party = smooth(prog(t, T("finale", "team", -0.5), 0.5));
      const greet = Math.sin(prog(t, tj + 0.8, 1.6) * Math.PI);
      const hop = k.moving ? Math.abs(Math.sin(k.phase)) * 0.22 : Math.abs(Math.sin(t * 6 + i * 1.3)) * (0.12 * working + 0.24 * party);
      pose(cr, t, { hop, squash: landSq, mood: 1, cheer: Math.max(party, working * (0.5 + 0.5 * Math.sin(t * 6 + i))), wave: greet, walk: k.moving ? k.phase : null });
    });

    // ── 客人：過橋進來 ──
    W.visitors.forEach((v, i) => {
      const t0 = visStart(i), u = prog(t, t0, VIS_D);
      v.visible = t >= t0;
      if (!v.visible) return;
      const path = [[9.4, 0.02, 0.9], [6.6, 0.26, 0.9], [4.3, 0, 0.9], [3.2, 0, 1.9 - (i % 3) * 0.5], dest[i]];
      const a = along(path, smooth(u) * 0.35 + u * 0.65);
      v.position.set(a.x, a.y, a.z);
      const party = smooth(prog(t, T("finale", "team", -0.5), 0.5));
      if (u < 1) { v.rotation.y = a.ry; pose(v, t, { hop: Math.abs(Math.sin(a.dist * 3.2)) * 0.2, walk: a.dist * 6.4, mood: 1 }); }
      else { v.rotation.y = Math.atan2(0 - a.x, 4 - a.z) * 0.5; pose(v, t, { hop: Math.abs(Math.sin(t * 6.3 + i * 0.9)) * (0.05 + 0.22 * party), cheer: party * (0.6 + 0.4 * Math.sin(t * 5 + i)), mood: 1, look: Math.sin(t * 0.8 + i) * 0.4 }); }
    });

    // ── 01 品牌官網 ──
    const siteUp = pop(t, T("website", "build", 0.1), 0.7);
    setScale(W.site, siteUp); W.site.position.y = (1 - siteUp) * -0.6;
    W.pageMat.emissiveIntensity = lerp(0.02, 0.42, smooth(prog(t, T("website", "build", 0.75), 0.35))) + night * 0.25;
    W.pageMat.color.setScalar(lerp(0.25, 1, smooth(prog(t, T("website", "build", 0.75), 0.35))));
    const cu = inOut(prog(t, T("website", "trust", 0.1), T("website", "site") - T("website", "trust") - 0.1));
    const click = Math.sin(prog(t, T("website", "site"), 0.3) * Math.PI);
    W.cursor.position.set(lerp(0.75, -0.3, cu), lerp(2.3, 3.06, cu), 0.14 + 0.12 * (1 - click));
    setScale(W.cursor, pop(t, T("website", "trust", -0.1), 0.4) * (1 - click * 0.22) * (1 - smooth(prog(t, tS + 0.2, 0.4))));
    W.hearts.forEach((h, i) => {
      const u = prog(t, T("website", "site", 0.12 + i * 0.09), 1.5);
      h.position.set(btnWorld.x + (rnd(i, 51) - 0.5) * 1.5 * u, btnWorld.y + u * 1.9 + Math.sin(u * 6 + i) * 0.08, btnWorld.z + 0.25);
      setSprite(h, outBack(clamp01(u * 4)) * (0.8 + rnd(i, 52) * 0.6), u > 0 ? 1 - smooth((u - 0.6) / 0.4) : 0);
    });

    // ── 02 電商・金流 ──
    const cartIn = outCubic(prog(t, T("shop", "cart", -0.5), 0.75));
    W.cart.position.x = lerp(6.2, 2.35, cartIn); W.cart.visible = t > T("shop", "cart", -0.5);
    W.cart.rotation.z = Math.sin(prog(t, T("shop", "cart", 0.2), 0.5) * Math.PI) * -0.06;
    setScale(W.pos, pop(t, T("shop", "pay", -0.25), 0.5));
    const swipe = Math.sin(prog(t, T("shop", "pay", 0.15), 0.55) * Math.PI);
    W.card.position.y = 1.78 - swipe * 0.26; setScale(W.card, pop(t, T("shop", "pay", 0), 0.3) * (1 - smooth(prog(t, T("shop", "pay", 0.8), 0.3))));
    W.termScreen.emissiveIntensity = smooth(prog(t, T("shop", "pay", 0.45), 0.15)) * 2.2;
    W.coins.forEach((cn, i) => {
      const u = prog(t, T("shop", "pay", 0.55 + i * 0.07), 1.15);
      const a = rnd(i, 61) * Math.PI * 2, sp = 0.5 + rnd(i, 62) * 1.0;
      cn.position.set(termWorld.x + Math.cos(a) * sp * u * 1.3, termWorld.y + 3.4 * u - 4.6 * u * u + 0.2, termWorld.z + Math.sin(a) * sp * u * 0.8 + u * 0.6);
      cn.rotation.set(u * 14 + i, u * 6, 1.2);
      setScale(cn, u > 0 && u < 1 ? Math.min(1, u * 8) * (1 - smooth((u - 0.8) / 0.2)) : 0);
    });
    W.parcels.forEach((p, i) => {
      const u = prog(t, T("shop", "order", i * 0.3), 0.6), s = cartSlots[i];
      const dx = W.cart.position.x - 2.35;
      p.position.set(s.x + dx, s.y + (1 - outBounce(u)) * 2.4, s.z); p.rotation.set(0, i * 0.5 - 0.5, (1 - u) * 0.8);
      setScale(p, pop(t, T("shop", "order", i * 0.3), 0.25));
    });
    W.orders.forEach((s, i) => {
      const u = prog(t, T("shop", "order", 0.25 + i * 0.3), 1.5);
      s.position.set(2.2 + (i - 1) * 0.5, 1.9 + u * 1.5, 1.9);
      setSprite(s, outBack(clamp01(u * 5)), u > 0 ? 1 - smooth((u - 0.65) / 0.35) : 0);
    });

    // ── 03 LINE AI 客服 ──
    setScale(W.kiosk, pop(t, tAI + 0.2, 0.6));
    const talking = t > T("ai", "reply") && t < T("ai", "reply", 2.2) ? 1 : 0;
    W.botHead.rotation.z = Math.sin(t * 2.4) * 0.06; W.botHead.rotation.y = Math.sin(t * 1.1) * 0.25 + 0.3;
    W.bot.position.y = 0.8 + Math.abs(Math.sin(t * 3)) * 0.04 + talking * Math.abs(Math.sin(t * 9)) * 0.05;
    W.botEye.emissiveIntensity = 1.4 + Math.sin(t * 5) * 0.4 + talking * 1.2;
    W.botEyes.forEach((e) => { e.scale.y = ((t * 0.45) % 1) > 0.94 ? 0.2 : 1; });
    W.botChest.emissiveIntensity = 1 + Math.sin(t * 6) * 0.6;
    W.botArms[1].position.y = 0.34 + talking * (0.3 + Math.sin(t * 12) * 0.08);
    W.lineSignMat.emissiveIntensity = 0.25 + night * 0.7;
    const chatOut = 1 - smooth(prog(t, tAU - 0.25, 0.4));
    W.chat.forEach((b, i) => {
      const k = outBack(prog(t, chatT[i], 0.38));
      let rise = 0; for (let j = i + 1; j < chatT.length; j++) rise += outCubic(prog(t, chatT[j], 0.35));
      b.position.set(i % 2 ? -1.5 : -0.05, 2.55 + rise * 0.62, 2.9);
      setSprite(b, k * chatOut, chatOut);
    });
    W.zzz.forEach((z, i) => {
      const u = ((t * 0.42 + i * 0.33) % 1);
      z.position.set(0.95 + u * 0.7 + i * 0.05, 1.85 + u * 1.2, 0.9);
      setSprite(z, asleep ? 0.6 + u * 0.7 : 0, asleep ? Math.sin(u * Math.PI) : 0);
    });

    // ── 04 AI 自動化 ──
    setScale(W.mach, pop(t, tAU + 0.2, 0.6));
    const run = Math.max(0, t - T("auto", "report", 0.4));
    W.gears[0].rotation.z = run * 2.4; W.gears[1].rotation.z = -run * 3.43 + 0.3; W.gears[2].rotation.z = run * 4.0;
    W.machLight.emissiveIntensity = run > 0 ? 1.5 + Math.sin(t * 10) * 1.2 : 0;
    W.mach.scale.y *= 1 + (run > 0 ? Math.sin(t * 14) * 0.012 : 0);
    W.papers.forEach((p, i) => {
      const u = prog(t, paperT[i], 0.62), e = inOut(u);
      const from = tmp.set(ok.p[0] + 0.35, 1.0, ok.p[2] + 0.1);
      p.position.set(lerp(from.x, funnelWorld.x, e), lerp(from.y, funnelWorld.y, e) + Math.sin(e * Math.PI) * 1.1, lerp(from.z, funnelWorld.z, e));
      p.rotation.set(u * 5, u * 3 + i, u * 4);
      setScale(p, u > 0 && u < 1 ? Math.min(1, u * 6) * (1 - smooth((u - 0.8) / 0.2)) : 0);
    });
    const bu = prog(t, T("auto", "notify", 0.2), 1.7);
    W.bell.position.set(1.75, 2.75 + outBack(clamp01(bu * 3)) * 0.15, 2.6); W.bell.material.rotation = Math.sin(bu * 34) * 0.32 * (1 - bu);
    setSprite(W.bell, outBack(clamp01(bu * 4)), bu > 0 ? 1 - smooth((bu - 0.75) / 0.25) : 0);
    W.bars.forEach((b, i) => { const g = outBack(prog(t, T("auto", "run", 0.1 + i * 0.18), 0.5), 2.2) * b.userData.h; b.scale.y = Math.max(g, 0.001); b.position.y = 0.45 + g / 2; b.visible = g > 0.002; });
    const acu = prog(t, T("auto", "run", 0.85), 2.4);
    W.mach.localToWorld(tmp.set(0.55, 2.2, 0.1)); W.autoCheck.position.copy(tmp);
    setSprite(W.autoCheck, outBack(clamp01(acu * 5)), acu > 0 ? 1 - smooth(prog(t, tG - 0.2, 0.4)) : 0);

    // ── 05 搜尋：地標、搜尋列、橋 ──
    const du = prog(t, T("geo", "google", -0.35), 0.75);
    W.pin.visible = du > 0; W.pin.position.y = 3.05 + (1 - outBounce(du)) * 7 + Math.sin(t * 2) * 0.05 * (du >= 1 ? 1 : 0);
    W.pin.rotation.y = t * 0.9;
    W.waves.forEach((w, i) => {
      const live = t > T("geo", "google", 0.3) && t < tC + 0.2;
      const u = ((t * 0.55 + i / 3) % 1);
      w.position.set(0, 3.2, -1); w.scale.setScalar(0.5 + u * 3.2); w.material.opacity = live ? (1 - u) * 0.8 : 0; w.visible = live;
    });
    const hideSearch = 1 - smooth(prog(t, tC - 0.1, 0.4));
    W.search.position.set(1.9, 6.35 + Math.sin(t * 1.4) * 0.06, -0.6); setSprite(W.search, pop(t, T("geo", "google", 0.45), 0.5) * hideSearch, hideSearch);
    W.aiBadge.position.set(3.0, 5.25 + Math.sin(t * 1.4 + 1) * 0.06, -0.6); setSprite(W.aiBadge, pop(t, T("geo", "aiRead", 0.1), 0.5) * hideSearch, hideSearch);
    W.planks.forEach((p, i) => setScale(p, pop(t, T("geo", "google", 0.5 + i * 0.09), 0.4)));

    // ── 06 維護代管 ──
    const dg = outCubic(prog(t, T("care", "live", -0.15), 1.1)), dgo = 1 - smooth(prog(t, tE + 0.3, 1.2));
    W.dome.scale.setScalar(Math.max(0.001, dg)); W.dome.visible = dg > 0;
    const pulse = Math.sin(prog(t, T("care", "live", -0.15), 1.6) * Math.PI);
    W.domeMat.opacity = (0.1 + pulse * 0.22 + Math.sin(t * 2.2) * 0.02) * (dg > 0 ? 1 : 0) * dgo; W.domeMat.emissiveIntensity = 0.25 + pulse * 0.9;
    W.domeRing.scale.setScalar(Math.max(0.001, dg)); W.domeRing.visible = dg > 0; W.domeRing.material.opacity = dgo;
    const su = prog(t, T("care", "year", 0), 5), sOut = 1 - smooth(prog(t, tF - 0.1, 0.5));
    W.shield.position.set(2.7, 5.9 + Math.sin(t * 1.5) * 0.08, 0.6); setSprite(W.shield, outBack(clamp01(su * 9)) * sOut, sOut);
    const wr = t > tC + 1.0 && t < tF;
    W.wrench.visible = wr;
    if (wr) { const h = W.crew[2].userData.handR.getWorldPosition(tmp); W.wrench.position.set(h.x + 0.05, h.y + 0.2, h.z); W.wrench.rotation.z = Math.sin(t * 7) * 0.7; }

    // ── 結尾的紙花 ──
    const cf0 = T("finale", "team", -0.5);
    for (let i = 0; i < W.confetti.count; i++) {
      const life = t - cf0 - rnd(i, 71) * 1.2, per = 3.4 + rnd(i, 72) * 1.6, u = (life % per) / per;
      const a = rnd(i, 73) * Math.PI * 2, r = Math.sqrt(rnd(i, 74)) * 5.6;
      dummy.position.set(Math.cos(a) * r + Math.sin(life * 1.3 + i) * 0.35, 11 - u * 13.5, Math.sin(a) * r * 0.8 + 0.8);
      dummy.rotation.set(life * (2 + rnd(i, 75) * 3), life * 1.7 + i, life * (1 + rnd(i, 76) * 2));
      dummy.scale.setScalar(life > 0 && t < TOTAL ? 1 : 0.0001);
      dummy.updateMatrix(); W.confetti.setMatrixAt(i, dummy.matrix);
    }
    W.confetti.instanceMatrix.needsUpdate = true;

    // ── 火花 ──
    let n = 0;
    for (const b of bursts) {
      const u = prog(t, b.t, 0.7);
      for (let k = 0; k < b.n && n < W.sparks.count; k++, n++) {
        const a = (k / b.n) * Math.PI * 2 + rnd(n, 81), el = (rnd(n, 82) - 0.2) * 1.2, d = outCubic(u) * (0.7 + rnd(n, 83) * 0.9) * b.r;
        dummy.position.set(b.p.x + Math.cos(a) * d, b.p.y + el * d + Math.sin(u * Math.PI) * 0.3, b.p.z + Math.sin(a) * d * 0.6 + 0.2);
        dummy.rotation.set(u * 6, u * 4 + k, 0);
        dummy.scale.setScalar(u > 0 && u < 1 ? Math.sin(u * Math.PI) * (0.8 + rnd(n, 84)) : 0.0001);
        dummy.updateMatrix(); W.sparks.setMatrixAt(n, dummy.matrix);
      }
    }
    for (; n < W.sparks.count; n++) { dummy.scale.setScalar(0.0001); dummy.updateMatrix(); W.sparks.setMatrixAt(n, dummy.matrix); }
    W.sparks.instanceMatrix.needsUpdate = true;
  }

  return { update, sfx };
}
