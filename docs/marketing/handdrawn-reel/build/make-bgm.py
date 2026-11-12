"""合成配樂（bgm.wav）與音效（sfx.wav）——手繪版。

曲風配合畫面：烏克麗麗刷弦、彈指、鐘琴，最後加口哨。全部程式合成，
不會被 IG 的版權偵測靜音。節拍格線的原點是第二幕（交給阿瓦羅）的進場點。

  第 1 幕（寫不完的清單）  小調、零零落落的幾顆撥弦，愈寫愈多
  第 2 幕（交給阿瓦羅）    轉大調，C、G 各刷一小節
  第 3–8 幕（六件事）      C–G–Am–F，「下、下上、上下上」的刷法＋彈指
  第 9 幕（劃完了）        加口哨主旋律與拍手
  第 10 幕（片尾）         最後一個和弦，鐘琴收尾

音效（鉛筆沙沙聲、麥克筆、打勾、翻頁……）的時間表來自 reel.html，
`node render.js --sfx` 匯出成 sfx.json。需要 numpy、scipy。
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
def glock(m, d=1.0, tau=0.22):
    t = tt(d); f = hz(m)
    return fade((np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*2.76*f*t)*np.exp(-t/0.05)) * np.exp(-t / tau), 0.001)

def uke(m, d=0.7):
    """烏克麗麗的一根弦：尼龍弦泛音少、衰減快"""
    t = tt(d); f = hz(m); s = 0
    for k in range(1, 6): s = s + (1 / k ** 1.6) * np.sin(2*np.pi*f*k*t) * np.exp(-t * (3.2 + 2.2 * k))
    return fade(s, 0.002)

def whistle(m, d):
    t = tt(d); f = hz(m) * (1 + 0.004 * np.sin(2*np.pi*5.6*t) * np.minimum(1, t / 0.15))
    e = np.minimum(1, t / 0.04) * np.minimum(1, (d - t) / 0.08)
    return np.sin(2*np.pi*np.cumsum(f) / SR) * e + 0.02 * hp(noise(len(t)), 3000) * e

def snap():
    t = tt(0.12); return bp(noise(len(t)), 1500, 5200) * np.exp(-t / 0.018)

def strum(b, t, notes, up=False, gain=0.16):
    """刷弦：四根弦依序撥出去，上刷反過來、比較輕"""
    seq = notes[::-1] if up else notes
    for i, m in enumerate(seq):
        put(b, t + i * (0.011 if up else 0.016), uke(m), gain * (0.7 if up else 1.0) * (1 - i * 0.06), (i - 1.5) * 0.25)

CH = dict(C=dict(root=36, uke=[67, 60, 64, 72]), G=dict(root=43, uke=[67, 62, 67, 71]),
          Am=dict(root=45, uke=[69, 60, 64, 69]), F=dict(root=41, uke=[69, 60, 65, 69]))
PROG = ["C", "G", "Am", "F"]
PATTERN = [(0, False), (1, False), (1.5, True), (2.5, True), (3, False), (3.5, True)]     # 下、下上、上下上
MELODY = dict(C=[(0, 76), (1, 79), (1.5, 76), (2, 72), (3, 76)], G=[(0, 74), (1, 79), (1.5, 74), (2, 71), (3, 74)],
              Am=[(0, 72), (1, 76), (1.5, 72), (2, 69), (3, 72)], F=[(0, 72), (1, 77), (1.5, 81), (2, 79), (3, 77), (3.5, 74)])

beats_total = int(round((DUR - G0) / BEAT))
b_of = lambda sid: int(round((SC[sid]["start"] - G0) / BEAT))
B_WEB, B_DONE, B_CTA = (b_of(k) for k in ("web", "done", "cta"))
T = lambda b: G0 + b * BEAT

drums, low, mid, air = buf(), buf(), buf(), buf()

# 第 1 幕：小調，音愈來愈密——清單愈寫愈長
seq = [57, 60, 64, 60, 57, 62, 65, 62, 57, 60, 64, 69, 64, 60, 65, 62, 59, 62, 65, 68]
tcur = 0.5
for i, m in enumerate(seq):
    put(air, tcur, uke(m, 0.9), 0.26, (i % 3 - 1) * 0.4)
    tcur += max(0.24, 0.62 - i * 0.022)
    if tcur > G0 - 0.5: break
for det, pan in ((1.0, -0.5), (1.004, 0.5)): put(mid, 0, pad([45, 52, 57], G0 + 0.3, det), 0.2, pan)

for b in range(beats_total):
    t0 = T(b)
    if b < B_WEB:                              # 交給阿瓦羅：C、G 各一小節，一拍刷一下
        name = "C" if b < 4 else "G"; ch = CH[name]
        strum(air, t0, ch["uke"], gain=0.2)
        if b % 4 == 0:
            put(low, t0, bass(ch["root"], BEAT * 2), 0.5)
            for i, m in enumerate(ch["uke"]): put(air, t0 + BEAT * 2 + i * 0.12, glock(m + 12, 1.0, 0.35), 0.14, (i - 1.5) * 0.3)
        if b >= 6: put(air, t0, snap(), 0.2); put(air, t0 + BEAT / 2, snap(), 0.26)
        continue
    if b >= B_CTA:
        if b == B_CTA:                         # 片尾：最後一個和弦
            strum(air, t0, [60, 64, 67, 72, 76], gain=0.3); put(low, t0, bass(36, 1.6), 0.6); put(drums, t0, kick(), 0.7)
        k = b - B_CTA
        if 1 <= k < 10:
            for j, m in enumerate(((72, 76), (79, 84), (76, 79), (84, 88))[k % 4]): put(air, t0 + j * BEAT / 2, glock(m, 1.6, 0.5), 0.2 * (1 - k / 12), (j - 0.5) * 0.6)
        continue

    bar, bb = divmod(b - B_WEB, 4)
    name = PROG[bar % 4]; ch = CH[name]
    party = b >= B_DONE
    for off, up in PATTERN:
        if int(off) == bb: strum(air, T(b) + (off - bb) * BEAT, ch["uke"], up)
    if bb in (0, 2): put(low, t0, bass(ch["root"] if bb == 0 else ch["root"] + 7, BEAT * 0.6), 0.5); put(drums, t0, kick(), 0.5 if not party else 0.7)
    if bb in (1, 3): put(air, t0, snap(), 0.3); 
    if party and bb in (1, 3): put(air, t0, clap(), 0.2)
    put(drums, t0 + BEAT / 2, hat(0.02), 0.09, 0.3)
    if party: put(drums, t0, hat(0.012), 0.06, -0.3)
    if bb == 0:
        for det, pan in ((0.997, -0.6), (1.003, 0.6)): put(mid, t0, pad([n - 12 for n in ch["uke"][1:]], BEAT * 4 + 0.3, det), 0.16, pan)
        if bar % 2 == 1 or party:                # 鐘琴隔一小節出來一次，免得一直跟旁白搶
            for off, m in MELODY[name]:
                put(air, t0 + off * BEAT, glock(m, 0.9, 0.3), 0.13, 0.2)
                if party: put(mid, t0 + off * BEAT, whistle(m, BEAT * 0.45), 0.12, -0.2)

put(air, SC["web"]["start"] - BEAT, swell(BEAT, 2500, 10000), 0.2)
put(air, SC["done"]["start"] - BEAT, swell(BEAT), 0.3)

def reverb(x, wet=0.2, tau=0.4, length=1.5):
    t = tt(length); out = x.copy()
    for c in range(2):
        ir = lp(noise(len(t)), 6500) * np.exp(-t / tau); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, c] += wet * signal.fftconvolve(x[:, c], ir)[:N]
    return out

music = drums + low + mid + reverb(air)
music[-int(1.6 * SR):] *= (np.linspace(1, 0, int(1.6 * SR)) ** 1.5)[:, None]
music[:int(0.6 * SR)] *= np.linspace(0, 1, int(0.6 * SR))[:, None]

# ── 音效 ────────────────────────────────────────────────
fx = buf()
count = dict(sparkle=0, pencil=0)
PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91]
def thump(f=70, tau=0.09, d=0.3):
    t = tt(d); return np.sin(2*np.pi*np.cumsum(f * 0.7 + f * np.exp(-t / 0.03)) / SR) * np.exp(-t / tau)
def woodblock(f, tau=0.012):
    t = tt(0.07); return (np.sin(2*np.pi*f*t) + 0.5*np.sin(2*np.pi*f*2.4*t)) * np.exp(-t / tau)
def chirp(f0, f1, d):
    t = tt(d); return fade(np.sin(2*np.pi*np.cumsum(f0 + (f1 - f0) * (t / d)) / SR) * np.sin(np.pi * t / d))

def sfx(e):
    name, t, d = e["name"], e["t"], e.get("d", 0.4)
    if name == "pencil":                          # 鉛筆在紙上：高頻的沙沙聲，音量跟著一筆一筆起伏
        tv = tt(d); k = count["pencil"]; count["pencil"] += 1
        env = np.abs(np.sin(2*np.pi*(5.5 + (k % 4)) * tv + k)) ** 0.6 * (0.6 + 0.4 * lp(np.abs(noise(len(tv))), 40) * 3)
        put(fx, t, bp(noise(len(tv)), 2600, 8200) * env * np.minimum(1, tv / 0.02) * np.minimum(1, (d - tv) / 0.04), 0.13, (k % 3 - 1) * 0.3)
    elif name == "marker":                        # 麥克筆一劃：比鉛筆低、帶一點吱聲
        tv = tt(0.34); put(fx, t, bp(noise(len(tv)), 700, 2600) * np.sin(np.pi * tv / 0.34) ** 1.5, 0.3)
        put(fx, t, chirp(1250, 1700, 0.3), 0.035)
    elif name == "check":
        tv = tt(0.22); put(fx, t, bp(noise(len(tv)), 900, 3200) * np.sin(np.pi * tv / 0.22) ** 2, 0.3)
        put(fx, t + 0.16, bell(84, 0.5, 0.16), 0.3); put(fx, t + 0.24, bell(91, 0.7, 0.22), 0.28)
    elif name == "page":
        tv = tt(0.24); put(fx, t, hp(noise(len(tv)), 1800) * (tv / 0.24) ** 1.5 * np.exp(-((tv - 0.2) / 0.05) ** 2 * 0 ), 0.16)
        tv = tt(0.08); put(fx, t + 0.22, lp(noise(len(tv)), 2500) * np.exp(-tv / 0.02), 0.2)
    elif name == "pop":
        tv = tt(0.09); put(fx, t, np.sin(2*np.pi*np.cumsum(420 + 900 * (tv / 0.09)) / SR) * np.exp(-tv / 0.03), 0.4)
    elif name == "ding":
        put(fx, t, bell(88, 0.7, 0.2), 0.24, 0.2); put(fx, t + 0.05, bell(95, 0.7, 0.22), 0.18, 0.2)
    elif name == "sparkle":
        k = count["sparkle"]; count["sparkle"] += 1
        for i in range(6): put(fx, t + i * 0.06, bell(PENTA[(i * 2 + k * 3) % 9] + 12, 0.6, 0.16), 0.16, rng.uniform(-0.6, 0.6))
    elif name == "coin":
        for i in range(8):
            tv = tt(0.25); f = rng.uniform(2300, 4200)
            put(fx, t + i * 0.08 + rng.uniform(0, 0.03), (np.sin(2*np.pi*f*tv) + 0.6*np.sin(2*np.pi*f*1.47*tv)) * np.exp(-tv / 0.05), 0.15, rng.uniform(-0.5, 0.7))
    elif name == "thud":
        put(fx, t, thump(95, 0.05, 0.2), 0.5); tv = tt(0.06); put(fx, t, lp(noise(len(tv)), 1500) * np.exp(-tv / 0.012), 0.3)
    elif name == "tick":
        put(fx, t, woodblock(1900, 0.009), 0.3)
    elif name == "gears":
        for i in range(12): put(fx, t + i * 0.07, woodblock(700 if i % 2 else 520, 0.008), 0.22, 0.3)
    elif name == "sigh":
        put(fx, t, chirp(430, 250, 0.55), 0.2); tv = tt(0.6); put(fx, t, bp(noise(len(tv)), 600, 2400) * np.sin(np.pi * tv / 0.6) ** 2, 0.18)
    elif name == "stamp":
        put(fx, t, thump(65, 0.09), 0.95); tv = tt(0.12); put(fx, t, lp(noise(len(tv)), 1800) * np.exp(-tv / 0.025), 0.7)
    elif name == "logo":
        for i, m in enumerate((60, 67, 72, 76, 79)): put(fx, t + i * 0.13, bell(m, 2.0, 0.7), 0.2, (i - 2) * 0.3)
    elif name == "hit":
        put(fx, t, thump(55, 0.2, 0.7), 0.5); tv = tt(0.8); put(fx, t, hp(noise(len(tv)), 4200) * np.exp(-tv / 0.2), 0.12)
    else:
        raise SystemExit(f"reel.html 用了沒定義的音效：{name}")

for e in SFX: sfx(e)
fx = fx + 0.12 * (reverb(fx, wet=1.0, tau=0.22, length=0.9) - fx)

def write(name, x, peak):
    x = x / np.max(np.abs(x)) * peak
    wavfile.write(os.path.join(SP, name), SR, (x * 32767).astype(np.int16))
    print(f"已寫出 {name}  {len(x)/SR:.2f}s")

write("bgm.wav", np.tanh(music * 1.1), 0.85)
write("sfx.wav", fx, 0.85)
print(f"拍速 {TL['bpm']}  格線原點 {G0}s  共 {beats_total} 拍  音效 {len(SFX)} 個")
