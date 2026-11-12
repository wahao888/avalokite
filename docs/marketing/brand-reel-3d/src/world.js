// 場景裡的所有東西：浮島、阿福的小店、阿瓦羅的熱氣球，以及六項服務各自的道具。
// 這裡只負責「蓋出來、擺好」，什麼時候出現、怎麼動，全部寫在 story.js。
import { THREE, C, M, Mown, box, sph, cyl, cap, mesh, group, canvasTex, rrect, font, drawLogo, sprite, bubble, tag, makeChar, rnd } from "./kit.js";

export function buildWorld(scene) {
  const W = {};

  // ── 浮島 ─────────────────────────────────────────
  const island = group();
  const R = 4.3;
  // 草皮：邊緣收圓的圓盤
  const grassPts = [[0, 0.02], [R - 0.35, 0.02], [R - 0.08, -0.08], [R, -0.3], [R - 0.06, -0.55], [0, -0.55]].map(([x, y]) => new THREE.Vector2(x, y));
  island.add(mesh(new THREE.LatheGeometry(grassPts, 72), M(0x9fcb86, { r: 0.95 })));
  // 土塊：往下收成一個不規則的錐
  const soilPts = [[0, -0.5], [R - 0.12, -0.5], [R - 0.5, -1.3], [R - 1.5, -2.4], [R - 2.6, -3.5], [0.5, -4.6], [0, -4.8]].map(([x, y]) => new THREE.Vector2(x, y));
  const soil = mesh(new THREE.LatheGeometry(soilPts, 40), M(C.soil, { r: 1 }));
  island.add(soil);
  for (let i = 0; i < 9; i++) {         // 幾顆掛在底下的石頭，打破錐形的規則感
    const a = rnd(i, 1) * Math.PI * 2, rr = 1.2 + rnd(i, 2) * 2.2, y = -1.2 - rnd(i, 3) * 1.8;
    const rock = mesh(new THREE.DodecahedronGeometry(0.35 + rnd(i, 4) * 0.4, 1), M(i % 2 ? C.soilDark : C.soil, { r: 1 }), Math.cos(a) * rr, y, Math.sin(a) * rr);
    rock.rotation.set(rnd(i, 5) * 3, rnd(i, 6) * 3, 0); island.add(rock);
  }
  // 小徑
  for (let i = 0; i < 6; i++) {
    const s = mesh(cyl(0.3 - (i % 2) * 0.05, 0.3 - (i % 2) * 0.05, 0.05, 20), M(C.cream, { r: 0.95 }), Math.sin(i * 1.7) * 0.18, 0.03, 0.55 + i * 0.52);
    s.scale.z = 0.8; island.add(s);
  }
  scene.add(island); W.island = island;

  // 樹與灌木
  const tree = (x, z, s = 1, tone = 0) => {
    const g = group(x, 0, z);
    g.add(mesh(cyl(0.11 * s, 0.15 * s, 0.9 * s, 12), M(C.walnut, { r: 0.95 }), 0, 0.45 * s, 0));
    const cols = [C.sage, C.moss, C.grassDark];
    g.add(mesh(sph(0.62 * s, 24, 18), M(cols[tone % 3], { r: 0.95 }), 0, 1.2 * s, 0),
      mesh(sph(0.44 * s, 24, 18), M(cols[(tone + 1) % 3], { r: 0.95 }), 0.32 * s, 1.55 * s, 0.1 * s),
      mesh(sph(0.38 * s, 24, 18), M(cols[(tone + 2) % 3], { r: 0.95 }), -0.3 * s, 1.5 * s, -0.12 * s));
    island.add(g); return g;
  };
  W.trees = [tree(-3.3, -1.9, 1.15, 0), tree(3.25, -2.2, 1.0, 1), tree(-3.55, 0.9, 0.75, 2), tree(2.2, -3.2, 0.8, 0), tree(-1.9, -3.3, 0.9, 1)];
  [[-3.75, -0.4, 0.5], [3.7, -0.9, 0.42], [-2.5, -2.85, 0.45], [1.0, -3.6, 0.5], [3.3, 2.0, 0.34], [-3.4, 2.1, 0.36], [-0.9, -3.55, 0.4]].forEach(([x, z, r], i) => {
    const b = mesh(sph(r, 20, 14), M([C.moss, C.sage, C.grassDark][i % 3], { r: 0.95 }), x, r * 0.45, z); b.scale.y = 0.75; island.add(b);
    island.add(mesh(sph(r * 0.6, 16, 12), M([C.sage, C.grassDark, C.moss][i % 3], { r: 0.95 }), x + r * 0.7, r * 0.3, z + 0.1));
  });
  W.flowers = [];
  for (let i = 0; i < 22; i++) {        // 花：故事一開始沒有，阿瓦羅來了之後才冒出來
    const a = rnd(i, 11) * Math.PI * 2, rr = 1.6 + rnd(i, 12) * 2.4;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (Math.abs(x) < 1.9 && z < 0.6 && z > -2.4) continue;      // 不要長在店裡
    const f = group(x, 0, z);
    f.add(mesh(cyl(0.012, 0.012, 0.16, 6), M(C.grassDark), 0, 0.08, 0, false),
      mesh(sph(0.065, 10, 8), M([C.butter, C.rose, C.paper, C.coral, C.lilac][i % 5], { r: 0.8 }), 0, 0.18, 0, false));
    island.add(f); W.flowers.push(f);
  }

  // ── 阿福的小店 ───────────────────────────────────
  const shop = group(0, 0, -1.0);
  shop.add(mesh(box(3.0, 1.9, 2.2, 0.12), M(C.paper, { r: 0.9 }), 0, 0.95, 0));
  shop.add(mesh(box(3.12, 0.28, 2.32, 0.08), M(C.wood, { r: 0.9 }), 0, 0.14, 0));              // 牆腳
  // 屋頂：山形，擠出一個三角柱
  const tri = new THREE.Shape(); tri.moveTo(-1.85, 0); tri.lineTo(0, 1.25); tri.lineTo(1.85, 0); tri.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: 2.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4 });
  roofGeo.translate(0, 0, -1.35);
  shop.add(mesh(roofGeo, M(C.roof, { r: 0.85 }), 0, 1.86, 0));
  shop.add(mesh(box(0.42, 0.9, 0.42, 0.05), M(C.cream, { r: 0.9 }), 0.95, 2.75, -0.5));       // 煙囪
  // 門
  shop.add(mesh(box(0.72, 1.25, 0.1, 0.08), M(C.walnut, { r: 0.8 }), -0.75, 0.75, 1.11));
  shop.add(mesh(sph(0.045, 12, 10), M(C.gold, { m: 0.7, r: 0.3 }), -0.52, 0.75, 1.18));
  // 櫥窗：玻璃單獨一份材質，晚上要亮起來
  shop.add(mesh(box(1.3, 0.95, 0.1, 0.07), M(C.walnut, { r: 0.8 }), 0.62, 1.0, 1.11));
  W.glass = Mown(0x8fa7b3, { r: 0.25, e: 0xffd9a0, ei: 0 });
  shop.add(mesh(box(1.14, 0.79, 0.06, 0.05), W.glass, 0.62, 1.0, 1.16));
  shop.add(mesh(box(0.05, 0.79, 0.04, 0.01), M(C.walnut), 0.62, 1.0, 1.2), mesh(box(1.14, 0.05, 0.04, 0.01), M(C.walnut), 0.62, 1.0, 1.2));
  // 遮陽棚：一條一條的布，story 會把它從收起來放成撐開
  const awning = group(0.62, 1.62, 1.14);
  for (let i = 0; i < 7; i++) {
    const s = mesh(box(0.2, 0.05, 0.62, 0.02), M(i % 2 ? C.paper : C.moss, { r: 0.95 }), -0.6 + i * 0.2, 0, 0.3);
    awning.add(s);
  }
  awning.rotation.x = 0.42; shop.add(awning); W.awning = awning;
  // 招牌：掛在門楣上，故事開頭是歪的
  const signTex = canvasTex(640, 200, (g, w, h) => {
    g.fillStyle = "#7A5C44"; rrect(g, 0, 0, w, h, 34); g.fill();
    g.fillStyle = "#F0EBE3"; g.font = font(108, 900, true); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("阿福小店", w / 2, h / 2 + 6);
  });
  const sign = group(0, 2.42, 1.5);
  sign.add(mesh(box(1.7, 0.54, 0.09, 0.06), M(C.walnut, { r: 0.85 })));
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
  signFace.position.z = 0.05; sign.add(signFace);
  shop.add(sign); W.sign = sign;
  // 路燈
  const lamp = group(-1.75, 0, 1.35);
  lamp.add(mesh(cyl(0.035, 0.05, 1.5, 10), M(C.ink, { r: 0.6 }), 0, 0.75, 0));
  W.bulb = Mown(0xfff0c8, { r: 0.4, e: 0xffc870, ei: 0 });
  lamp.add(mesh(sph(0.13, 16, 12), W.bulb, 0, 1.56, 0, false));
  shop.add(lamp);
  // 長椅：晚上阿福睡在這
  const bench = group(0.62, 0, 1.55);
  bench.add(mesh(box(1.1, 0.09, 0.4, 0.04), M(C.wood, { r: 0.9 }), 0, 0.38, 0), mesh(box(0.08, 0.38, 0.36, 0.03), M(C.walnut), -0.45, 0.19, 0), mesh(box(0.08, 0.38, 0.36, 0.03), M(C.walnut), 0.45, 0.19, 0));
  shop.add(bench);
  island.add(shop); W.shop = shop;

  W.lampLight = new THREE.PointLight(0xffc27a, 0, 9, 1.6);
  W.lampLight.position.set(-1.75, 1.6, 0.4); scene.add(W.lampLight);

  // 煙囪的煙
  W.smoke = [];
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(sph(0.16, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })); scene.add(p); W.smoke.push(p); }

  // 風滾草：沒人來的象徵
  W.tumble = group();
  for (let i = 0; i < 5; i++) {
    const ring = mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 20), M(0x9c8566, { r: 1 }), 0, 0, 0);
    ring.rotation.set(rnd(i, 21) * 3, rnd(i, 22) * 3, rnd(i, 23) * 3); W.tumble.add(ring);
  }
  scene.add(W.tumble);

  // ── 角色 ─────────────────────────────────────────
  W.owner = makeChar({ body: 0xf4efe6, apron: C.wood, hat: "hair", hair: 0x4a3728, seed: 1 });
  scene.add(W.owner);
  W.crew = [0, 1, 2].map((i) => {
    const c = makeChar({ body: C.moss, hat: "helmet", apron: C.mossDeep, seed: 3 + i * 2.3, skin: [0xf7d6bd, 0xeec3a2, 0xd9a47f][i] });
    scene.add(c); return c;
  });
  const vis = [
    { body: C.lilac, hat: "hair", hair: 0x2f2b26, bun: true }, { body: C.butter, hat: "beanie", hair: C.coral }, { body: C.teal, hat: "hair", hair: 0x8a5a3a },
    { body: C.rose, hat: "hair", hair: 0x3a2a20, bun: true }, { body: C.steel, hat: "beanie", hair: C.moss }, { body: C.coral, hat: "hair", hair: 0x2f2b26 },
  ];
  W.visitors = vis.map((o, i) => { const c = makeChar({ ...o, seed: 11 + i * 1.7, skin: i % 2 ? 0xeec3a2 : 0xf7d6bd }); c.scale.setScalar(0.9); scene.add(c); return c; });

  // ── 阿瓦羅的熱氣球 ───────────────────────────────
  const balloon = group();
  const stripe = canvasTex(1024, 512, (g, w, h) => {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? "#F0EBE3" : "#5F7155"; g.fillRect(i * w / 12, 0, w / 12 + 1, h); }
    g.fillStyle = "#3F4D39"; g.fillRect(0, h * 0.47, w, h * 0.06);
  });
  const env = new THREE.Mesh(sph(1.25, 48, 32), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.7 }));
  env.scale.set(1, 1.12, 1); env.position.y = 2.25; env.castShadow = true; balloon.add(env);
  balloon.add(mesh(cyl(0.42, 0.3, 0.5, 24), M(C.mossDeep, { r: 0.7 }), 0, 0.92, 0));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; balloon.add(mesh(cyl(0.012, 0.012, 0.75, 6), M(C.ink), Math.cos(a) * 0.3, 0.42, Math.sin(a) * 0.3, false)); }
  balloon.add(mesh(box(0.86, 0.5, 0.86, 0.1), M(C.wood, { r: 0.95 }), 0, -0.05, 0), mesh(box(0.92, 0.1, 0.92, 0.05), M(C.walnut), 0, 0.2, 0));
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.8, map: canvasTex(256, 256, (g) => {
    g.fillStyle = "#F0EBE3"; g.beginPath(); g.arc(128, 128, 122, 0, 7); g.fill(); drawLogo(g, 128, 132, 3.1);
  }) }));
  plate.position.set(0, -0.04, 0.44); balloon.add(plate);
  scene.add(balloon); W.balloon = balloon;

  // ── 01 品牌官網：一面立在店旁邊的大螢幕 ──────────
  const site = group(-2.75, 0, 0.75); site.rotation.y = 0.32;
  site.add(mesh(cyl(0.06, 0.08, 1.8, 12), M(C.ink, { r: 0.5 }), 0, 0.9, -0.05), mesh(cyl(0.42, 0.46, 0.08, 28), M(C.ink, { r: 0.5 }), 0, 0.04, -0.05));
  site.add(mesh(box(1.9, 2.5, 0.14, 0.12), M(0x25221e, { r: 0.4 }), 0, 2.9, 0));
  const pageTex = canvasTex(720, 960, (g, w, h) => {
    g.fillStyle = "#F0EBE3"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#E4DCCF"; g.fillRect(0, 0, w, 86);                       // 瀏覽器列
    ["#E8735A", "#F2B84B", "#06C755"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(46 + i * 44, 43, 13, 0, 7); g.fill(); });
    g.fillStyle = "#fff"; rrect(g, 200, 22, 470, 44, 22); g.fill();
    g.fillStyle = "#8C8478"; g.font = font(24, 500); g.textBaseline = "middle"; g.fillText("🔒 afu-shop.tw", 222, 45);
    const grd = g.createLinearGradient(0, 86, 0, 500); grd.addColorStop(0, "#c9d4bd"); grd.addColorStop(1, "#e9d6c2");
    g.fillStyle = grd; g.fillRect(0, 86, w, 420);                           // 主視覺
    g.fillStyle = "#5F7155"; g.font = font(24, 600); g.fillText("手作 ・ 選物 ・ 咖啡", 56, 160);
    g.fillStyle = "#2F2B26"; g.font = font(92, 900, true); g.fillText("阿福小店", 52, 250);
    g.fillStyle = "#7A5C44"; g.font = font(30, 500); g.fillText("每一件，都是認真做的", 56, 334);
    g.fillStyle = "#5F7155"; rrect(g, 56, 384, 260, 76, 38); g.fill();
    g.fillStyle = "#fff"; g.font = font(32, 700); g.fillText("立即逛逛 →", 92, 424);
    for (let i = 0; i < 3; i++) {                                           // 商品卡
      const x = 44 + i * 218; g.fillStyle = "#fff"; rrect(g, x, 548, 196, 250, 22); g.fill();
      g.fillStyle = ["#d9c2a4", "#b9c9ab", "#e3b9a6"][i]; rrect(g, x + 14, 562, 168, 138, 14); g.fill();
      g.fillStyle = "#d6cdbd"; rrect(g, x + 14, 722, 130, 16, 8); g.fill(); rrect(g, x + 14, 754, 84, 16, 8); g.fill();
    }
    g.fillStyle = "#d6cdbd"; rrect(g, 44, 840, 632, 20, 10); g.fill(); rrect(g, 44, 884, 420, 20, 10); g.fill();
  });
  W.pageMat = new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.5, emissive: 0xffffff, emissiveMap: pageTex, emissiveIntensity: 0.35 });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 2.3), W.pageMat); page.position.set(0, 2.9, 0.075); site.add(page);
  scene.add(site); W.site = site;
  // 游標：白色箭頭
  const arrow = new THREE.Shape(); arrow.moveTo(0, 0); arrow.lineTo(0, -0.42); arrow.lineTo(0.1, -0.32); arrow.lineTo(0.17, -0.47); arrow.lineTo(0.23, -0.44); arrow.lineTo(0.16, -0.29); arrow.lineTo(0.3, -0.29); arrow.closePath();
  W.cursor = group();
  const cur = mesh(new THREE.ExtrudeGeometry(arrow, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }), M(C.ink, { r: 0.35 }));
  cur.scale.setScalar(0.95); W.cursor.add(cur); site.add(W.cursor);
  W.hearts = ["♥", "★", "♥", "✦", "★"].map((ch, i) => { const s = sprite(160, 160, (g) => { g.font = font(130, 700); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = ["#E8735A", "#F2B84B", "#E8735A", "#06C755", "#F2B84B"][i]; g.fillText(ch, 80, 86); }, 0.36); scene.add(s); return s; });

  // ── 02 電商・金流：購物車、刷卡機、包裹、金幣 ────
  const cart = group(2.35, 0, 1.35); cart.rotation.y = -0.5;
  const cm = M(C.paper, { r: 0.6 }), rim = M(C.moss, { r: 0.6 });
  cart.add(mesh(box(1.0, 0.07, 0.66, 0.03), cm, 0, 0.42, 0), mesh(box(1.0, 0.5, 0.06, 0.03), cm, 0, 0.67, 0.31), mesh(box(1.0, 0.5, 0.06, 0.03), cm, 0, 0.67, -0.31),
    mesh(box(0.06, 0.5, 0.66, 0.03), cm, 0.48, 0.67, 0), mesh(box(0.06, 0.5, 0.66, 0.03), cm, -0.48, 0.67, 0),
    mesh(box(1.08, 0.07, 0.74, 0.03), rim, 0, 0.93, 0));
  const handle = mesh(cyl(0.035, 0.035, 0.74, 10), rim, -0.72, 1.05, 0); handle.rotation.x = Math.PI / 2; cart.add(handle);
  [-1, 1].forEach((s) => { const bar = mesh(cyl(0.03, 0.03, 0.34, 8), rim, -0.6, 0.98, s * 0.33); bar.rotation.z = 1.05; cart.add(bar); });
  [[-0.36, 0.26], [0.36, 0.26], [-0.36, -0.26], [0.36, -0.26]].forEach(([x, z]) => { const wh = mesh(cyl(0.11, 0.11, 0.07, 20), M(C.ink, { r: 0.5 }), x, 0.11, z); wh.rotation.x = Math.PI / 2; cart.add(wh); cart.add(mesh(cyl(0.02, 0.02, 0.3, 6), M(C.steel, { m: 0.6, r: 0.4 }), x, 0.26, z)); });
  scene.add(cart); W.cart = cart;
  W.parcels = [0, 1, 2].map((i) => {
    const p = group(); const s = [0.5, 0.44, 0.4][i];
    p.add(mesh(box(s, s * 0.82, s, 0.035), M(C.parcel, { r: 0.95 })), mesh(box(s * 1.01, s * 0.83, s * 0.2, 0.01), M(C.paper, { r: 0.9 })));
    scene.add(p); return p;
  });
  const pos = group(3.3, 0, 0.35); pos.rotation.y = -0.75;
  pos.add(mesh(box(0.5, 0.9, 0.5, 0.06), M(C.wood, { r: 0.9 }), 0, 0.45, 0), mesh(box(0.62, 0.07, 0.62, 0.03), M(C.walnut), 0, 0.92, 0));
  const term = group(0, 0.96, 0); term.rotation.x = -0.5;
  term.add(mesh(box(0.34, 0.5, 0.09, 0.04), M(C.ink, { r: 0.4 })));
  W.termScreen = Mown(0x123b22, { r: 0.3, e: C.green, ei: 0 });
  term.add(mesh(box(0.27, 0.2, 0.02, 0.01), W.termScreen, 0, 0.11, 0.045));
  for (let i = 0; i < 6; i++) term.add(mesh(box(0.06, 0.045, 0.02, 0.008), M(C.steel, { r: 0.5 }), -0.09 + (i % 3) * 0.09, -0.06 - Math.floor(i / 3) * 0.07, 0.045));
  term.position.y = 1.18; pos.add(term);
  W.card = mesh(box(0.3, 0.19, 0.016, 0.006), M(0x4b7fb8, { r: 0.35, m: 0.2 }), 0, 1.5, 0.2); W.card.add(mesh(box(0.07, 0.055, 0.004, 0.002), M(C.gold, { m: 0.8, r: 0.3 }), -0.07, 0.01, 0.01, false));
  pos.add(W.card);
  scene.add(pos); W.pos = pos;
  W.coins = [];
  for (let i = 0; i < 14; i++) { const c = mesh(cyl(0.11, 0.11, 0.035, 20), M(C.gold, { m: 0.75, r: 0.28 })); scene.add(c); W.coins.push(c); }
  W.orders = [0, 1, 2].map(() => { const s = tag("訂單 +1", { bg: "#06C755", worldH: 0.42 }); scene.add(s); return s; });

  // ── 03 LINE AI 客服：小機器人的服務台 ────────────
  const kiosk = group(-1.75, 0, 2.55); kiosk.rotation.y = 0.35;
  kiosk.add(mesh(box(1.2, 0.72, 0.5, 0.07), M(C.wood, { r: 0.9 }), 0, 0.36, 0), mesh(box(1.32, 0.08, 0.6, 0.04), M(C.paper, { r: 0.7 }), 0, 0.76, 0));
  kiosk.add(mesh(cyl(0.03, 0.03, 1.15, 8), M(C.ink), 0.55, 1.35, -0.12));
  const lineSign = canvasTex(256, 256, (g) => {
    g.fillStyle = "#06C755"; rrect(g, 0, 0, 256, 256, 60); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.ellipse(128, 116, 86, 70, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(96, 172); g.lineTo(84, 214); g.lineTo(140, 180); g.closePath(); g.fill();
    g.fillStyle = "#06C755"; g.font = font(50, 900); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("LINE", 128, 120);
  });
  W.lineSignMat = new THREE.MeshStandardMaterial({ map: lineSign, roughness: 0.5, emissive: 0xffffff, emissiveMap: lineSign, emissiveIntensity: 0.25, transparent: true });
  const ls = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56), W.lineSignMat); ls.position.set(0.55, 2.05, -0.1); kiosk.add(ls);
  kiosk.add(mesh(box(0.6, 0.6, 0.06, 0.12), M(C.green, { r: 0.5 }), 0.55, 2.05, -0.14));
  // 機器人
  const bot = group(-0.12, 0.8, -0.02);
  bot.add(mesh(cap(0.22, 0.16), M(0xfafafa, { r: 0.35 }), 0, 0.3, 0));
  W.botChest = Mown(0x0d3a1f, { r: 0.3, e: C.green, ei: 0.2 });
  bot.add(mesh(sph(0.06, 14, 10), W.botChest, 0, 0.32, 0.2, false));
  const bh = group(0, 0.84, 0);
  bh.add(mesh(box(0.66, 0.5, 0.5, 0.16), M(0xfafafa, { r: 0.35 })), mesh(box(0.52, 0.34, 0.06, 0.1), M(0x1b2620, { r: 0.25 }), 0, 0, 0.24));
  W.botEye = Mown(0x0d3a1f, { r: 0.3, e: 0x5eea93, ei: 0.3 });
  W.botEyes = [mesh(cap(0.035, 0.07), W.botEye, -0.12, 0.02, 0.275, false), mesh(cap(0.035, 0.07), W.botEye, 0.12, 0.02, 0.275, false)];
  bh.add(...W.botEyes);
  bh.add(mesh(cyl(0.012, 0.012, 0.2, 6), M(C.steel), 0, 0.34, 0, false), mesh(sph(0.05, 12, 10), W.botEye, 0, 0.46, 0, false));
  [-1, 1].forEach((s) => { const ear = mesh(cyl(0.07, 0.07, 0.06, 16), M(C.green, { r: 0.5 }), s * 0.35, 0, 0); ear.rotation.z = Math.PI / 2; bh.add(ear); });
  bot.add(bh); W.botHead = bh;
  W.botArms = [mesh(sph(0.08, 14, 10), M(0xfafafa, { r: 0.35 }), -0.33, 0.34, 0.06), mesh(sph(0.08, 14, 10), M(0xfafafa, { r: 0.35 }), 0.33, 0.34, 0.06)];
  bot.add(...W.botArms);
  kiosk.add(bot); W.bot = bot;
  scene.add(kiosk); W.kiosk = kiosk;
  W.chat = [
    bubble("還有營業嗎？", { bg: "#8DE472", fg: "#12200d", side: "right", worldH: 0.5 }),
    bubble("有喔！到晚上九點", { side: "left", worldH: 0.5 }),
    bubble("可以寄台中嗎？", { bg: "#8DE472", fg: "#12200d", side: "right", worldH: 0.5 }),
    bubble("可以，運費 80 元", { side: "left", worldH: 0.5 }),
  ];
  W.chat.forEach((s) => scene.add(s));
  W.zzz = ["z", "z", "Z"].map((ch, i) => { const s = sprite(140, 140, (g) => { g.font = `700 ${90 + i * 16}px Fraunces, Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#dfe6ff"; g.fillText(ch, 70, 74); }, 0.3 + i * 0.08); scene.add(s); return s; });

  // ── 04 AI 自動化：吃文件、吐報表的機器 ───────────
  const mach = group(1.95, 0, 2.55); mach.rotation.y = -0.3;
  mach.add(mesh(box(1.3, 1.05, 0.85, 0.12), M(C.moss, { r: 0.6 }), 0, 0.62, 0), mesh(box(1.4, 0.14, 0.95, 0.05), M(C.mossDeep, { r: 0.6 }), 0, 0.09, 0));
  const funnel = mesh(cyl(0.42, 0.16, 0.36, 28), M(C.paper, { r: 0.5 }), -0.3, 1.33, 0); mach.add(funnel);
  W.machLight = Mown(0x3a2f10, { r: 0.3, e: C.gold, ei: 0 });
  mach.add(mesh(sph(0.07, 14, 10), W.machLight, 0.42, 1.2, 0.2, false));
  const gearGeo = (ro, ri, teeth, depth = 0.1) => {
    const s = new THREE.Shape(), n = teeth * 4;
    for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2, r = i % 4 < 2 ? ro : ri; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
    const hole = new THREE.Path(); hole.absarc(0, 0, ri * 0.35, 0, Math.PI * 2, true); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }); g.translate(0, 0, -depth / 2); return g;
  };
  W.gears = [mesh(gearGeo(0.3, 0.23, 10), M(C.gold, { m: 0.5, r: 0.4 }), -0.22, 0.66, 0.47), mesh(gearGeo(0.2, 0.15, 7), M(C.paper, { m: 0.2, r: 0.5 }), 0.22, 0.48, 0.47), mesh(gearGeo(0.15, 0.11, 6), M(C.coral, { r: 0.5 }), 0.36, 0.84, 0.47)];
  mach.add(...W.gears);
  mach.add(mesh(box(1.0, 0.1, 0.5, 0.04), M(C.ink, { r: 0.5 }), 1.1, 0.4, 0), mesh(box(0.08, 0.4, 0.44, 0.03), M(C.mossDeep), 1.5, 0.2, 0));
  W.bars = [0.5, 0.8, 1.15].map((h, i) => { const b = mesh(box(0.2, 1, 0.26, 0.04), M([C.sage, C.wood, C.green][i], { r: 0.6 }), 0.84 + i * 0.27, 0.45, 0); b.userData.h = h; mach.add(b); return b; });
  scene.add(mach); W.mach = mach;
  W.papers = [0, 1, 2, 3].map((i) => {
    const p = group(); p.add(mesh(box(0.34, 0.44, 0.02, 0.008), M(0xffffff, { r: 0.8 })));
    for (let k = 0; k < 3; k++) p.add(mesh(box(0.22 - k * 0.04, 0.03, 0.006, 0.002), M(i % 2 ? C.sage : C.wood), -0.02, 0.1 - k * 0.09, 0.012, false));
    scene.add(p); return p;
  });
  W.bell = sprite(200, 200, (g) => { g.font = font(150); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("🔔", 100, 108); }, 0.5); scene.add(W.bell);
  W.autoCheck = tag("✓ 自動完成", { bg: "#06C755", worldH: 0.42 }); scene.add(W.autoCheck);

  // ── 05 搜尋：店頂上落下一根地標，橋接通外面 ──────
  const pin = group(0, 0, -1.0);
  pin.add(mesh(sph(0.5, 32, 24), M(C.coral, { r: 0.45 }), 0, 0.95, 0));
  const tip = mesh(new THREE.ConeGeometry(0.4, 0.8, 32), M(C.coral, { r: 0.45 }), 0, 0.35, 0); tip.rotation.x = Math.PI; pin.add(tip);
  pin.add(mesh(sph(0.2, 20, 14), M(0xffffff, { r: 0.4 }), 0, 0.98, 0.37, false));
  scene.add(pin); W.pin = pin;
  W.waves = [0, 1, 2].map(() => { const r = mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), Mown(C.coral, { r: 0.5, o: 0.8, e: C.coral, ei: 0.4 }), 0, 0, 0, false); r.rotation.x = Math.PI / 2; scene.add(r); return r; });
  W.search = sprite(900, 220, (g, w, h) => {
    g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 22; g.shadowOffsetY = 10;
    g.fillStyle = "#fff"; rrect(g, 20, 20, w - 40, h - 60, 80); g.fill(); g.shadowColor = "transparent";
    g.strokeStyle = "#8C8478"; g.lineWidth = 12; g.beginPath(); g.arc(116, 96, 34, 0, 7); g.stroke(); g.beginPath(); g.moveTo(142, 122); g.lineTo(168, 148); g.stroke();
    g.fillStyle = "#2F2B26"; g.font = font(78, 700); g.textBaseline = "middle"; g.fillText("阿福小店", 210, 102);
    g.fillStyle = "#06C755"; g.font = font(60, 700); g.fillText("第 1 筆 ✓", 580, 104);
  }, 1.05); scene.add(W.search);
  W.aiBadge = tag("✦ AI 也讀得懂", { bg: "#3F4D39", worldH: 0.72 }); scene.add(W.aiBadge);
  W.planks = [];
  for (let i = 0; i < 9; i++) {
    const p = group(4.45 + i * 0.5, -0.02 + Math.sin(i / 8 * Math.PI) * 0.22, 0.9);
    p.add(mesh(box(0.44, 0.09, 1.1, 0.03), M(i % 2 ? C.wood : 0xb8926f, { r: 0.95 })));
    if (i % 2 === 0) [-1, 1].forEach((s) => p.add(mesh(cyl(0.035, 0.035, 0.5, 8), M(C.walnut), 0, 0.28, s * 0.5), mesh(sph(0.055, 10, 8), M(C.paper), 0, 0.55, s * 0.5)));
    scene.add(p); W.planks.push(p);
  }

  // ── 06 維護代管：罩住整座島的防護罩 ──────────────
  W.domeMat = new THREE.MeshPhysicalMaterial({ color: 0x9ff0bd, roughness: 0.15, metalness: 0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, emissive: 0x06c755, emissiveIntensity: 0.25 });
  W.dome = new THREE.Mesh(new THREE.SphereGeometry(4.75, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), W.domeMat); W.dome.renderOrder = 5; scene.add(W.dome);
  W.domeRing = mesh(new THREE.TorusGeometry(4.75, 0.05, 10, 96), Mown(C.green, { r: 0.4, e: C.green, ei: 0.9, o: 1 }), 0, 0.05, 0, false); W.domeRing.rotation.x = Math.PI / 2; scene.add(W.domeRing);
  W.shield = sprite(420, 480, (g, w, h) => {
    g.shadowColor = "rgba(0,0,0,.28)"; g.shadowBlur = 24; g.shadowOffsetY = 10;
    g.fillStyle = "#06C755"; g.beginPath(); g.moveTo(210, 24); g.bezierCurveTo(290, 70, 350, 80, 390, 84); g.bezierCurveTo(396, 250, 340, 380, 210, 446); g.bezierCurveTo(80, 380, 24, 250, 30, 84); g.bezierCurveTo(70, 80, 130, 70, 210, 24); g.fill();
    g.shadowColor = "transparent"; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 150px Fraunces, Georgia, serif`; g.fillText("365", 210, 200); g.font = font(64, 700); g.fillText("天 顧著", 210, 310);
  }, 2.1); scene.add(W.shield);
  W.wrench = group();
  W.wrench.add(mesh(box(0.07, 0.5, 0.05, 0.02), M(C.steel, { m: 0.7, r: 0.35 })), mesh(new THREE.TorusGeometry(0.1, 0.04, 8, 16, Math.PI * 1.5), M(C.steel, { m: 0.7, r: 0.35 }), 0, 0.32, 0));
  scene.add(W.wrench);

  // ── 結尾的紙花 ───────────────────────────────────
  const N = 220;
  W.confetti = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.07, 0.015), new THREE.MeshStandardMaterial({ roughness: 0.6 }), N);
  const cols = [C.green, C.gold, C.coral, C.paper, C.sage, C.lilac, C.butter];
  for (let i = 0; i < N; i++) W.confetti.setColorAt(i, new THREE.Color(cols[i % cols.length]));
  W.confetti.castShadow = false; W.confetti.frustumCulled = false; scene.add(W.confetti);

  // 火花（冒出東西時的小星星）
  W.sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffd76a, emissiveIntensity: 1.6, roughness: 0.4 }), 96);
  W.sparks.castShadow = false; W.sparks.frustumCulled = false; scene.add(W.sparks);

  // ── 天空：雲、星星、月亮 ─────────────────────────
  W.cloudMat = Mown(0xffffff, { r: 1, e: 0xffffff, ei: 0.18 });
  W.clouds = [];
  const cloud = (x, y, z, s) => {
    const g = group(x, y, z);
    [[0, 0, 0, 1], [0.9, 0.1, 0.1, 0.72], [-0.95, 0.05, 0, 0.66], [0.35, 0.42, -0.1, 0.62], [-0.4, 0.38, 0.1, 0.55], [1.55, -0.08, 0, 0.42], [-1.55, -0.1, 0, 0.4]].forEach(([cx, cy, cz, r]) => {
      const m = mesh(sph(r, 24, 16), W.cloudMat, cx, cy, cz, false); m.scale.y = 0.72; g.add(m);
    });
    g.scale.setScalar(s); g.userData.x = x; scene.add(g); W.clouds.push(g); return g;
  };
  cloud(-6.5, 9.5, -14, 1.7); cloud(6.8, 12.5, -18, 2.1); cloud(4.2, 6.2, -12, 1.2); cloud(-4.6, 14.5, -20, 1.9); cloud(-8.5, 4.5, -10, 1.1); cloud(8.6, 2.4, -9, 1.0);
  // 雲海：把畫面下半鋪滿，島才有「浮著」的感覺，字幕後面也不會是一片空
  for (let i = 0; i < 26; i++) cloud(-13 + rnd(i, 31) * 26, -6.6 - rnd(i, 32) * 2.6, -12 + rnd(i, 33) * 22, 1.8 + rnd(i, 34) * 1.7);
  W.stars = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: 0xfff6d6, transparent: true, opacity: 0 }), 90);
  const d = new THREE.Object3D();
  for (let i = 0; i < 90; i++) { d.position.set(-16 + rnd(i, 41) * 32, 1 + rnd(i, 42) * 24, -22 - rnd(i, 43) * 6); d.scale.setScalar(0.5 + rnd(i, 44) * 1.4); d.rotation.z = rnd(i, 45) * 3; d.updateMatrix(); W.stars.setMatrixAt(i, d.matrix); }
  W.stars.frustumCulled = false; scene.add(W.stars);
  W.moonMat = new THREE.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: 0 });
  W.moon = new THREE.Mesh(sph(1.3, 40, 28), W.moonMat); W.moon.position.set(10.4, 4.6, -24); scene.add(W.moon);

  return W;
}
