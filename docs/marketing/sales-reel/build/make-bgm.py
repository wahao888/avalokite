"""合成配樂（bgm.wav）與音效（sfx.wav）——業務向形象官網短片。

業務要的是「有衝勁」：120 BPM、四拍大鼓、反拍開鈸、2、4 拍拍手，和弦是 C–G–Am–F。
全部程式合成，不會被 IG 的版權偵測靜音或限流。節拍格線的原點是第二幕的進場點，
make-vo.py 把之後每一幕都貼齊到拍子上，所以每個甩鏡都落在拍點。

結構跟著劇情走：
  第 1–2 幕（客戶說再考慮、查不到）  只有低通過的撥弦和心跳般的大鼓，壓住、不舒服
  第 3 幕（名片、LINE、網站）         鼓組一層一層加進來，尾巴一條上升音把人推進去
  第 4 幕（信任）                     落拍：整組進來，從這裡開始是主歌
  第 8 幕（真實案例）                 抽掉大鼓兩小節，讓「天天都在接諮詢」那句被聽見
  第 9–10 幕（價格、加 LINE）         全部回來，加一條高八度的旋律；最後一小節收在主和弦

音效的時間表從 reel.html 的 data-sfx 匯出（`node render.js --sfx` → sfx.json）。
需要 numpy、scipy。
"""
import json, os
import numpy as np
from scipy import signal
from scipy.io import wavfile

SP = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(SP, "timeline.json")))
SFX = json.load(open(os.path.join(SP, "sfx.json")))
SR = 44100
DUR = TL["total"]
N = int(DUR * SR)
BEAT = 60 / TL["bpm"]
G0 = TL["grid0"]
SC = {s["id"]: s for s in TL["scenes"]}
rng = np.random.default_rng(7)          # 固定種子：重跑出來的是同一首

def buf(): return np.zeros((N, 2), np.float64)
def tt(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def bp(x, lo, hi): return signal.sosfilt(signal.butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def hp(x, fc): return signal.sosfilt(signal.butter(2, fc, "highpass", fs=SR, output="sos"), x)
def lp(x, fc): return signal.sosfilt(signal.butter(2, fc, "lowpass", fs=SR, output="sos"), x)
def noise(n): return rng.standard_normal(n)

def put(b, t, sig, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i < 0: sig, i = sig[-i:], 0
    n = min(len(sig), N - i)
    if n <= 0: return
    a = (pan + 1) * np.pi / 4
    b[i:i+n, 0] += sig[:n] * np.cos(a) * gain * 1.414
    b[i:i+n, 1] += sig[:n] * np.sin(a) * gain * 1.414

def fade(x, a=0.004, r=0.01):
    n = len(x); k = int(a * SR); m = int(r * SR)
    x = x.copy(); x[:k] *= np.linspace(0, 1, k); x[n-m:] *= np.linspace(1, 0, m); return x

# ── 樂器 ────────────────────────────────────────────────
def kick():
    t = tt(0.32); f = 46 + 120 * np.exp(-t / 0.028)
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11) + 0.25 * lp(noise(len(t)), 2500) * np.exp(-t / 0.004))

def hat(d=0.03): t = tt(0.12); return hp(noise(len(t)), 7500) * np.exp(-t / d)
def clap():
    t = tt(0.3); e = sum(np.exp(-np.clip(t - d, 0, None) / 0.012) * (t >= d) for d in (0, 0.011, 0.023)) * 0.5 + np.exp(-t / 0.07)
    return bp(noise(len(t)), 900, 3600) * e

def bass(m, d):
    t = tt(d); f = hz(m)
    s = np.sin(2*np.pi*f*t) + 0.55*np.sin(4*np.pi*f*t) + 0.22*np.sin(6*np.pi*f*t)
    return fade(np.tanh(1.4 * s) * np.exp(-t / 0.22))

def pluck(m, d=0.5, bright=1.0):
    t = tt(d); f = hz(m); s = 0
    for k in range(1, 7):
        s = s + (1 / k ** 1.25) * np.sin(2*np.pi*f*k*t) * np.exp(-t * (5 + 2.6 * k) / bright)
    return fade(s, 0.002)

def bell(m, d=0.9, tau=0.28):
    t = tt(d); f = hz(m)
    return fade((np.sin(2*np.pi*f*t) + 0.45*np.sin(2*np.pi*2*f*t)*np.exp(-t/0.12) + 0.2*np.sin(2*np.pi*3.01*f*t)*np.exp(-t/0.06)) * np.exp(-t / tau), 0.002)

def pad(notes, d, detune):
    t = tt(d); s = 0
    for m in notes:
        f = hz(m) * detune
        s = s + np.sin(2*np.pi*f*t) + 0.38*np.sin(4*np.pi*f*t) + 0.16*np.sin(6*np.pi*f*t) + 0.07*np.sin(8*np.pi*f*t)
    e = np.minimum(1, t / 0.35) * np.minimum(1, (d - t) / 0.45)
    return s / len(notes) * e

def swell(d, lo=1500, hi=9000):
    """倒放鈸的效果：音量與亮度一起往上"""
    t = tt(d); return bp(noise(len(t)), lo, hi) * (t / d) ** 2.4

# ── 配樂 ────────────────────────────────────────────────
def supersaw(notes, d, cutoff=2600, detunes=(-0.12, -0.04, 0.05, 0.13)):
    """幾條微走音的鋸齒波疊在一起，再低通——流行舞曲那種亮而寬的和弦"""
    t = tt(d); s = 0
    for m in notes:
        for dc in detunes:
            f = hz(m + dc); s = s + 2 * ((t * f) % 1) - 1
    e = np.minimum(1, t / 0.01) * np.exp(-t / 0.22)
    return lp(s / (len(notes) * len(detunes)), cutoff) * e

def openhat(): t = tt(0.25); return hp(noise(len(t)), 6500) * np.exp(-t / 0.07)
def lead(m, d):
    t = tt(d); f = hz(m)
    s = np.sign(np.sin(2*np.pi*f*t)) * 0.4 + np.sin(2*np.pi*f*t)
    return lp(s, 3800) * np.minimum(1, t / 0.008) * np.exp(-t / 0.18)

CH = dict(
    C=dict(root=36, chord=[60, 64, 67, 72]), G=dict(root=43, chord=[59, 62, 67, 71]),
    Am=dict(root=45, chord=[60, 64, 69, 72]), F=dict(root=41, chord=[60, 65, 69, 72]),
)
PROG = ["C", "G", "Am", "F"]
# 旋律：每小節四個音，落在反拍上，聽起來比較「跳」
HOOK = dict(C=[(0.5, 79), (1.5, 76), (2.5, 79), (3.0, 81)], G=[(0.5, 79), (1.5, 74), (2.5, 79), (3.0, 83)],
            Am=[(0.5, 81), (1.5, 76), (2.5, 81), (3.0, 84)], F=[(0.5, 81), (1.5, 77), (2.5, 84), (3.0, 81)])

beats_total = int(round((DUR - G0) / BEAT))
b_of = lambda sid: int(round((SC[sid]["start"] - G0) / BEAT))
B_TRIO, B_TURN, B_CASE, B_OFFER, B_CTA = (b_of(k) for k in ("trio", "turn", "case", "offer", "cta"))
B_END = beats_total - 4                      # 最後一小節只留收尾
T = lambda b: G0 + b * BEAT

drums, low, mid, air = buf(), buf(), buf(), buf()
kick_t = []

# 第 1 幕：還沒有格線，只有一個低通過的和弦撥奏，跟心跳一樣的悶鼓
for i in range(int(G0 / BEAT)):
    t0 = i * BEAT
    if i % 2 == 0: put(drums, t0, kick(), 0.45)
    put(mid, t0 + BEAT / 2, lp(supersaw([57, 60, 64], 0.3), 900), 0.35, (-1) ** i * 0.3)
put(air, G0 - 1.0, swell(1.0, 2000, 9000), 0.25)

for b in range(beats_total):
    bar, bb = divmod(b, 4)
    t0 = T(b)
    name = PROG[bar % 4] if b < B_END else "C"
    ch = CH[name]
    if b >= B_END:
        if b == B_END:                       # 收尾：一記重拍＋主和弦
            put(drums, t0, kick(), 1.0); kick_t.append(t0)
            put(low, t0, bass(36, 1.4), 0.8)
            for det, pan in ((0.996, -0.6), (1.004, 0.6)): put(mid, t0, supersaw([60, 64, 67, 72, 76], 2.2, 3200) * 1.0, 0.5, pan)
            for i, m in enumerate((84, 88, 91, 96)): put(air, t0 + i * 0.06, bell(m, 1.8, 0.6), 0.14, (i - 1.5) * 0.3)
            t = tt(2.0); put(air, t0, hp(noise(len(t)), 5000) * np.exp(-t / 0.5), 0.2)
        continue

    intro = b < B_TRIO                       # 第 2 幕：還是壓著
    build = B_TRIO <= b < B_TURN             # 第 3 幕：一層一層加
    breakdown = B_CASE <= b < B_CASE + 8     # 真實案例：抽掉大鼓兩小節
    peak = b >= B_OFFER                      # 價格與 CTA：加旋律
    k = (b - B_TRIO) / max(1, B_TURN - B_TRIO)

    # 鼓
    if not breakdown and (not intro or bb in (0, 2)):
        put(drums, t0, kick(), 0.9 if not intro else 0.55); kick_t.append(t0)
    if not intro:
        if not build or k > 0.35: put(drums, t0 + BEAT / 2, openhat(), 0.16 if not build else 0.16 * k)
        if bb in (1, 3) and (not build or k > 0.6): put(air, t0, clap(), 0.4)
        for j in range(4 if not breakdown else 2): put(drums, t0 + j * BEAT / (4 if not breakdown else 2), hat(0.01), 0.05 + 0.03 * (j % 2), -0.3)
    if build and b >= B_TURN - 4:            # 落拍前一小節：小鼓滾奏加速
        n = 4 if b < B_TURN - 2 else 8
        for j in range(n): put(air, t0 + j * BEAT / n, clap(), 0.12 + 0.25 * k)

    # 貝斯：八分音符，跟著大鼓被側鏈壓
    if not intro:
        for j in range(2): put(low, t0 + j * BEAT / 2, bass(ch["root"] + (12 if j else 0), BEAT * 0.45), 0.6 if not breakdown else 0.35)
    elif bb == 0:
        put(low, t0, bass(ch["root"], BEAT * 1.5), 0.4)

    # 和弦：反拍刷一下（舞曲的「嗆」）
    cut = 900 if intro else (900 + 2600 * k if build else 3000)
    for det, pan in ((0.996, -0.55), (1.004, 0.55)):
        put(mid, t0 + BEAT / 2, supersaw(ch["chord"], 0.32, cut), 0.32 if not breakdown else 0.24, pan)
    if breakdown and bb == 0:
        for det, pan in ((0.997, -0.6), (1.003, 0.6)): put(mid, t0, pad(ch["chord"], BEAT * 4 + 0.3, det), 0.26, pan)

    # 旋律
    if peak and bb == 0:
        for off, m in HOOK[name]: put(air, t0 + off * BEAT, lead(m, BEAT * 0.45), 0.13, 0.15)
    if (B_TURN <= b < B_CASE) and bb == 0 and bar % 2 == 1:
        for off, m in HOOK[name][:2]: put(air, t0 + off * BEAT, bell(m + 12, 0.6, 0.18), 0.09, -0.2)

put(air, SC["turn"]["start"] - BEAT * 4, swell(BEAT * 4), 0.55)
t = tt(BEAT * 4); put(air, SC["turn"]["start"] - BEAT * 4, np.sin(2*np.pi*np.cumsum(200 + 1400 * (t / t[-1]) ** 2) / SR) * (t / t[-1]) ** 2, 0.1)
put(air, SC["offer"]["start"] - BEAT * 2, swell(BEAT * 2), 0.35)

duck = np.ones(N)
env = np.exp(-tt(0.3) / 0.08)
for kt in kick_t:
    i = int(kt * SR); n = min(len(env), N - i)
    duck[i:i+n] = np.minimum(duck[i:i+n], 1 - 0.6 * env[:n])
low *= duck[:, None]; mid *= (0.35 + 0.65 * duck)[:, None]

def reverb(x, wet=0.2, tau=0.38, length=1.5):
    t = tt(length); out = x.copy()
    for c in range(2):
        ir = lp(noise(len(t)), 6500) * np.exp(-t / tau); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, c] += wet * signal.fftconvolve(x[:, c], ir)[:N]
    return out

music = drums + low + reverb(mid, 0.15) + reverb(air)
music[-int(1.2 * SR):] *= (np.linspace(1, 0, int(1.2 * SR)) ** 1.5)[:, None]
music[:int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))[:, None]

# ── 音效 ────────────────────────────────────────────────
fx = buf()
def thump(f=70, tau=0.09, d=0.3):
    t = tt(d); return np.sin(2*np.pi*np.cumsum(f * 0.7 + f * np.exp(-t / 0.03)) / SR) * np.exp(-t / tau)
def chirp(f0, f1, d, tau=None):
    t = tt(d); f = f0 + (f1 - f0) * (t / d)
    return fade(np.sin(2*np.pi*np.cumsum(f) / SR) * (np.exp(-t / tau) if tau else np.sin(np.pi * t / d)))
def sweep(d, lo, hi, up=True):
    tv = tt(d); x = noise(len(tv)); out = np.zeros(len(tv)); seg = len(tv) // 10
    for i in range(10):
        q = i / 9 if up else 1 - i / 9; fc = lo * ((hi / lo) ** q); a, b = i * seg, (i + 1) * seg if i < 9 else len(tv)
        out[a:b] = bp(x, fc * 0.7, fc * 1.4)[a:b]
    return out * np.sin(np.pi * tv / d) ** 2

def sfx(name, t):
    if name == "pop":
        tv = tt(0.09); put(fx, t, np.sin(2*np.pi*np.cumsum(420 + 900 * (tv / 0.09)) / SR) * np.exp(-tv / 0.03), 0.42)
    elif name == "msg":                       # 對方傳來一則訊息
        put(fx, t, bell(84, 0.4, 0.12), 0.32); put(fx, t + 0.09, bell(79, 0.5, 0.16), 0.3)
    elif name == "type":
        for i in range(6):
            tv = tt(0.03); put(fx, t + i * 0.15 + 0.02, (0.6 * noise(len(tv)) + np.sin(2*np.pi*(2100 + 250 * (i % 3))*tv)) * np.exp(-tv / 0.005), 0.24)
    elif name == "hit":
        put(fx, t, thump(60, 0.14, 0.5), 0.75); tv = tt(0.5); put(fx, t, hp(noise(len(tv)), 3500) * np.exp(-tv / 0.12), 0.14)
    elif name == "impact":
        put(fx, t, thump(45, 0.3, 1.0), 1.0); tv = tt(1.4); put(fx, t, hp(noise(len(tv)), 4200) * np.exp(-tv / 0.4), 0.3)
        put(fx, t, sweep(0.8, 300, 4000, up=False), 0.3)
    elif name in ("whoosh", "swish"):
        d = 0.36 if name == "swish" else 0.5
        put(fx, t - d * 0.6, sweep(d, 500, 6500), 0.42 if name == "swish" else 0.5)
    elif name == "stamp":
        put(fx, t, thump(65, 0.09), 0.95); tv = tt(0.12); put(fx, t, lp(noise(len(tv)), 1800) * np.exp(-tv / 0.025), 0.7)
    elif name == "deny":
        for i, m in enumerate((52, 49)):
            tv = tt(0.12); put(fx, t + i * 0.12, lp(np.sign(np.sin(2*np.pi*hz(m)*tv)), 900) * np.exp(-tv / 0.07), 0.24)
    elif name == "ok":
        put(fx, t, bell(84, 0.5, 0.16), 0.3); put(fx, t + 0.08, bell(91, 0.7, 0.22), 0.3)
    elif name == "ding":
        put(fx, t, bell(88, 0.7, 0.2), 0.26, 0.2); put(fx, t + 0.05, bell(95, 0.7, 0.22), 0.2, 0.2)
    elif name == "thud":
        put(fx, t, thump(95, 0.05, 0.2), 0.55); tv = tt(0.06); put(fx, t, lp(noise(len(tv)), 1500) * np.exp(-tv / 0.012), 0.3)
    elif name == "scroll":
        put(fx, t, sweep(0.7, 800, 5000), 0.3)
        for i in range(8): put(fx, t + i * 0.07, bell(96, 0.1, 0.02), 0.06)
    elif name == "tap":
        tv = tt(0.05); put(fx, t, (np.sin(2*np.pi*1600*tv) + 0.5 * noise(len(tv))) * np.exp(-tv / 0.008), 0.35)
    elif name == "notify":                    # 手機震動＋兩個音的提示聲
        tv = tt(0.22); put(fx, t, bp(noise(len(tv)), 90, 260) * (np.sin(2*np.pi*27*tv) > 0) * np.exp(-tv / 0.18), 0.45)
        put(fx, t + 0.02, bell(79, 0.5, 0.14), 0.38); put(fx, t + 0.12, bell(86, 0.6, 0.18), 0.38)
    elif name == "tick":
        tv = tt(0.05); put(fx, t, np.sin(2*np.pi*1900*tv) * np.exp(-tv / 0.009), 0.3)
        put(fx, t, bell(91, 0.3, 0.08), 0.12)
    else:
        raise SystemExit(f"reel.html 用了沒定義的音效：{name}")

for e in SFX: sfx(e["name"], e["t"])
fx = fx + 0.15 * (reverb(fx, wet=1.0, tau=0.22, length=0.9) - fx)

def write(name, x, peak):
    x = x / np.max(np.abs(x)) * peak
    wavfile.write(os.path.join(SP, name), SR, (x * 32767).astype(np.int16))
    print(f"已寫出 {name}  {len(x)/SR:.2f}s")

write("bgm.wav", np.tanh(music * 1.15), 0.85)
write("sfx.wav", fx, 0.85)
print(f"拍速 {TL['bpm']}  格線原點 {G0}s  共 {beats_total} 拍  音效 {len(SFX)} 個")
