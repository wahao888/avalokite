"""合成配樂（bgm.wav）與音效（sfx.wav）——3D 品牌動畫版。

自己合成而不是找現成音樂，理由跟上一支一樣：IG 的版權偵測會把來路不明的配樂
靜音或限流。節拍格線的原點是第二幕（熱氣球出現）的進場點，之後每一幕都貼齊
半小節，所以鏡頭換位的地方都落在拍子上。

曲子跟著故事走：
  第 1 幕（沒人知道的小店）  小調、很慢的幾顆鐘琴音，底下只有風聲
  第 2 幕（阿瓦羅來了）      F → G 往上推，豎琴上行，接進主題
  第 3–8 幕（六項服務）      C–Am–F–G，撥弦＋木琴的「蹦恰」律動，鐘琴主旋律
        其中第 5 幕（半夜的 AI 客服）抽掉鼓，變成搖籃曲
  第 9 幕（大合照）          加弦樂鋪底與口哨聲部，全部一起上
  第 10 幕（片尾）           主和弦落下，鐘琴琶音慢慢收

音效的時間表來自 src/story.js（`node render.js --sfx` 匯出成 sfx.json），
跟畫面上的動作是同一組時間點。需要 numpy、scipy。
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
    """鐘琴：基音加一個不成整數倍的高泛音，敲下去是亮的、尾巴很短"""
    t = tt(d); f = hz(m)
    return fade((np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*2.76*f*t)*np.exp(-t/0.05) + 0.15*np.sin(2*np.pi*5.4*f*t)*np.exp(-t/0.02)) * np.exp(-t / tau), 0.001)

def marimba(m, d=0.4):
    t = tt(d); f = hz(m)
    return fade((np.sin(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*4*f*t)*np.exp(-t/0.03)) * np.exp(-t / 0.11), 0.002)

def whistle(m, d):
    """口哨：正弦波加一點抖音，進得慢、收得也慢"""
    t = tt(d); f = hz(m) * (1 + 0.004 * np.sin(2*np.pi*5.6*t) * np.minimum(1, t / 0.15))
    e = np.minimum(1, t / 0.04) * np.minimum(1, (d - t) / 0.08)
    return np.sin(2*np.pi*np.cumsum(f) / SR) * e + 0.02 * hp(noise(len(t)), 3000) * e

def strings(notes, d, detune):
    t = tt(d); s = 0
    for m in notes:
        f = hz(m) * detune
        for k in range(1, 7): s = s + (1 / k) * np.sin(2*np.pi*f*k*t + k)
    e = np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.5)
    return lp(s, 2600) / len(notes) * e * 0.6

def snap():
    t = tt(0.12); return bp(noise(len(t)), 1500, 5200) * np.exp(-t / 0.018)

CH = dict(
    C=dict(root=36, fifth=43, pad=[48, 55, 60, 64], arp=[60, 64, 67, 72, 67, 64, 60, 64]),
    Am=dict(root=33, fifth=40, pad=[45, 52, 57, 60], arp=[57, 60, 64, 69, 64, 60, 57, 60]),
    F=dict(root=41, fifth=36, pad=[41, 53, 57, 60], arp=[60, 65, 69, 72, 69, 65, 60, 65]),
    G=dict(root=43, fifth=38, pad=[43, 55, 59, 62], arp=[59, 62, 67, 71, 67, 62, 59, 62]),
)
PROG = ["C", "Am", "F", "G"]
MELODY = dict(C=[(0, 76), (0.5, 79), (1, 84), (2, 79), (3, 76)], Am=[(0, 76), (0.5, 81), (1, 84), (2, 81), (3, 76)],
              F=[(0, 77), (0.5, 81), (1, 84), (2, 81), (3, 77)], G=[(0, 79), (0.5, 83), (1, 86), (2.5, 83), (3, 79), (3.5, 81)])
LULLABY = dict(C=[(0, 79), (2, 76)], Am=[(0, 76), (2, 72)], F=[(0, 77), (2, 72)], G=[(0, 74), (2, 79)])

beats_total = int(round((DUR - G0) / BEAT))
b_of = lambda sid: int(round((SC[sid]["start"] - G0) / BEAT))
B_WEB, B_AI, B_AUTO, B_FIN, B_CTA = (b_of(k) for k in ("website", "ai", "auto", "finale", "cta"))
T = lambda b: G0 + b * BEAT

drums, low, mid, air = buf(), buf(), buf(), buf()      # air＝要加殘響的那一路
kick_t = []

# 第 1 幕：小調、很慢。阿福一個人
for det, pan in ((1.0, -0.5), (1.004, 0.5)):
    put(mid, 0, pad([45, 52, 57, 60], G0 + 0.4, det), 0.36, pan)
for tm, m in ((0.5, 69), (1.5, 72), (2.5, 76), (3.5, 74), (4.4, 72), (5.2, 69)):
    put(air, tm, glock(m, 1.6, 0.6), 0.3, -0.1)

for b in range(beats_total):
    bar, bb = divmod(b, 4)
    t0 = T(b)
    intro = b < B_WEB                       # 熱氣球降下來：F、G 各一小節往上推
    name = ["F", "G"][min(bar, 1)] if intro else PROG[((b - B_WEB) // 4) % 4]
    bb = b % 4 if intro else (b - B_WEB) % 4
    ch = CH[name]
    night = B_AI <= b < B_AUTO
    finale = B_FIN <= b < B_CTA
    outro = b >= B_CTA

    if outro:
        if b == B_CTA:                       # 片尾：主和弦落下，慢慢放掉
            put(drums, t0, kick(), 0.9); kick_t.append(t0)
            put(low, t0, bass(36, 1.6), 0.7)
            for det, pan in ((0.997, -0.6), (1.003, 0.6)): put(mid, t0, strings([48, 55, 60, 64, 67], DUR - t0, det), 0.34, pan)
            t = tt(2.2); put(air, t0, hp(noise(len(t)), 5000) * np.exp(-t / 0.55), 0.14)
        k = b - B_CTA
        if k < 14:
            for j, m in enumerate(((72, 76), (79, 84), (76, 79), (84, 88))[k % 4]):
                put(air, t0 + j * BEAT / 2, glock(m, 1.6, 0.5), 0.2 * (1 - k / 16), (j - 0.5) * 0.6)
        continue

    if bb == 0:                              # 鋪底：一小節一個和弦
        for det, pan in ((0.997, -0.6), (1.003, 0.6)):
            put(mid, t0, pad(ch["pad"], BEAT * 4 + 0.3, det), 0.3 if not night else 0.42, pan)
            if finale: put(mid, t0, strings([n + 12 for n in ch["pad"][1:]], BEAT * 4 + 0.4, det), 0.3, pan)

    if intro:                                # 豎琴上行，一拍四個音
        for k in range(4):
            i = b * 4 + k
            put(air, t0 + k * BEAT / 4, glock(ch["arp"][i % 4] + 12 * (i // 12), 1.0, 0.35), 0.1 + 0.012 * i, (i % 5 - 2) * 0.25)
        if b >= 4: put(drums, t0, hat(0.02), 0.1 + 0.03 * (b - 4)); put(drums, t0 + BEAT / 2, hat(0.02), 0.1 + 0.03 * (b - 4))
        if b >= 6:
            for k in range(4): put(air, t0 + k * BEAT / 4, snap(), 0.12 + 0.03 * (b - 6) * 4 / 4 + 0.02 * k)
        continue

    if night:                                # 搖籃曲：沒有鼓，只有撥弦與鐘琴
        put(air, t0, marimba(ch["arp"][0], 0.5), 0.2, -0.3)
        put(air, t0 + BEAT / 2, marimba(ch["arp"][2], 0.5), 0.13, 0.3)
        if bb == 0:
            put(low, t0, bass(ch["root"], BEAT * 1.5), 0.4)
            for off, m in LULLABY[name]: put(air, t0 + off * BEAT, glock(m + 12, 1.8, 0.7), 0.17, 0.1)
        continue

    # 主題：「蹦恰」——1、3 拍大鼓與根音，2、4 拍彈指與和弦
    if bb in (0, 2) or finale:
        put(drums, t0, kick(), 0.85 if bb in (0, 2) else 0.6); kick_t.append(t0)
    if bb in (1, 3):
        put(air, t0, snap(), 0.34); put(air, t0, clap(), 0.16 if finale else 0.08)
    put(drums, t0 + BEAT / 2, hat(0.035), 0.13, 0.25)
    for k in range(2): put(drums, t0 + k * BEAT / 2 + (BEAT / 4 if finale else 0), hat(0.012), 0.07, -0.3)
    put(low, t0, bass(ch["root"] if bb in (0, 1) else ch["fifth"], BEAT * 0.55), 0.62 if bb in (0, 2) else 0.0)
    if bb in (1, 3):                         # 後半拍的和弦刷一下
        for m in ch["pad"][1:]: put(air, t0, marimba(m + 12, 0.3), 0.075, 0.2)
    for k in range(2):                       # 八分音符的木琴琶音
        i = (b * 2 + k) % 8
        put(air, t0 + k * BEAT / 2, marimba(ch["arp"][i] + 12, 0.4), 0.16 if k == 0 else 0.11, -0.45 if (b * 2 + k) % 2 else 0.45)
    if bb == 0:
        for off, m in MELODY[name]:
            put(air, t0 + off * BEAT, glock(m, 0.9, 0.3), 0.15, 0.15)
            if finale: put(mid, t0 + off * BEAT, whistle(m, BEAT * (0.45 if off % 1 else 0.9)), 0.11, -0.15)

# 進主題前的滾奏、每一幕進場前的吸氣聲
put(air, SC["website"]["start"] - BEAT * 2, swell(BEAT * 2), 0.4)
for sid in ("shop", "auto", "geo", "care"):
    put(air, SC[sid]["start"] - BEAT, swell(BEAT, 2500, 10000), 0.16)
put(air, SC["finale"]["start"] - BEAT * 2, swell(BEAT * 2), 0.4)
put(air, SC["cta"]["start"] - BEAT, swell(BEAT), 0.3)

duck = np.ones(N)
env = np.exp(-tt(0.3) / 0.09)
for kt in kick_t:
    i = int(kt * SR); n = min(len(env), N - i)
    duck[i:i+n] = np.minimum(duck[i:i+n], 1 - 0.4 * env[:n])
low *= duck[:, None]; mid *= (0.5 + 0.5 * duck)[:, None]

def echo(x, d, fb=0.25):
    k = int(d * SR); y = x.copy()
    y[k:, 0] += fb * x[:-k, 1]; y[k:, 1] += fb * x[:-k, 0]
    return y

def reverb(x, wet=0.22, tau=0.42, length=1.7):
    t = tt(length); out = x.copy()
    for c in range(2):
        ir = lp(noise(len(t)), 6500) * np.exp(-t / tau); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, c] += wet * signal.fftconvolve(x[:, c], ir)[:N]
    return out

music = drums + low + mid + reverb(echo(air, BEAT * 0.75), wet=0.26, tau=0.5)
music[-int(1.6 * SR):] *= (np.linspace(1, 0, int(1.6 * SR)) ** 1.5)[:, None]
music[:int(0.8 * SR)] *= np.linspace(0, 1, int(0.8 * SR))[:, None]

# ── 音效 ────────────────────────────────────────────────
fx = buf()
PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91]
count = dict(plank=0, sparkle=0)
def chirp(f0, f1, d, tau=None):
    t = tt(d); f = f0 + (f1 - f0) * (t / d)
    return fade(np.sin(2*np.pi*np.cumsum(f) / SR) * (np.exp(-t / tau) if tau else np.sin(np.pi * t / d)))
def thump(f=70, tau=0.09, d=0.3):
    t = tt(d); return np.sin(2*np.pi*np.cumsum(f * 0.7 + f * np.exp(-t / 0.03)) / SR) * np.exp(-t / tau)
def woodblock(f, tau=0.012):
    t = tt(0.07); return (np.sin(2*np.pi*f*t) + 0.5*np.sin(2*np.pi*f*2.4*t)) * np.exp(-t / tau)

def sfx(name, t):
    if name == "wind":
        d = 5.0; tv = tt(d); put(fx, t, bp(noise(len(tv)), 250, 900) * (0.5 + 0.5 * np.sin(2*np.pi*0.23*tv - 1)) * np.sin(np.pi * tv / d), 0.5)
    elif name == "sigh":
        put(fx, t, chirp(430, 250, 0.55), 0.22); tv = tt(0.6); put(fx, t, bp(noise(len(tv)), 600, 2400) * np.sin(np.pi * tv / 0.6) ** 2, 0.2)
    elif name == "swell":
        for i, m in enumerate((60, 64, 67, 72, 76, 79, 84, 88)): put(fx, t + 0.25 + i * 0.11, bell(m, 1.4, 0.5), 0.2, (i - 3.5) * 0.2)
    elif name == "land":
        put(fx, t, thump(80, 0.07), 0.6); put(fx, t + 0.02, chirp(220, 560, 0.16, 0.07), 0.3)
    elif name == "sparkle":
        k = count["sparkle"]; count["sparkle"] += 1
        for i in range(7): put(fx, t + i * 0.055, bell(PENTA[(i * 2 + k * 3) % 9] + 12, 0.6, 0.16), 0.17, rng.uniform(-0.6, 0.6))
    elif name == "build":
        for i in range(3): put(fx, t + i * 0.13, woodblock(1100 + i * 150), 0.4, -0.3)
        put(fx, t + 0.1, chirp(380, 1250, 0.55), 0.2)
    elif name == "pop":
        tv = tt(0.09); f = 420 + 900 * (tv / 0.09); put(fx, t, np.sin(2*np.pi*np.cumsum(f) / SR) * np.exp(-tv / 0.03), 0.42)
    elif name == "click":
        put(fx, t, woodblock(2600, 0.005), 0.4); put(fx, t + 0.07, woodblock(1900, 0.005), 0.3)
    elif name == "roll":
        tv = tt(0.75); put(fx, t, lp(noise(len(tv)), 420) * (0.6 + 0.4 * np.sin(2*np.pi*13*tv)) * np.sin(np.pi * tv / 0.75), 0.9)
    elif name == "beep":
        for i, f in enumerate((1760, 2349)):
            tv = tt(0.08); put(fx, t + i * 0.1, lp(np.sign(np.sin(2*np.pi*f*tv)), 5000) * fade(np.ones(len(tv)), 0.004, 0.02), 0.13)
    elif name == "coins":
        for i in range(10):
            tv = tt(0.25); f = rng.uniform(2300, 4200)
            put(fx, t + i * 0.075 + rng.uniform(0, 0.03), (np.sin(2*np.pi*f*tv) + 0.6*np.sin(2*np.pi*f*1.47*tv)) * np.exp(-tv / 0.05), 0.16, rng.uniform(-0.5, 0.7))
    elif name == "thud":
        put(fx, t, thump(95, 0.05, 0.2), 0.5); tv = tt(0.06); put(fx, t, lp(noise(len(tv)), 1500) * np.exp(-tv / 0.012), 0.3)
    elif name == "ding":
        put(fx, t, bell(88, 0.7, 0.2), 0.24, 0.2); put(fx, t + 0.05, bell(95, 0.7, 0.22), 0.18, 0.2)
    elif name == "night":
        for i, m in enumerate((88, 84, 81, 76, 72)): put(fx, t + i * 0.16, bell(m, 1.6, 0.6), 0.2, 0.5 - i * 0.25)
    elif name == "msg":
        tv = tt(0.1); put(fx, t, np.sin(2*np.pi*np.cumsum(300 + 500 * (tv / 0.1)) / SR) * np.exp(-tv / 0.035), 0.4, 0.3)
    elif name == "reply":
        put(fx, t + 0.02, bell(79, 0.5, 0.14), 0.36, -0.3); put(fx, t + 0.12, bell(84, 0.6, 0.18), 0.36, -0.3)
    elif name == "paper":
        tv = tt(0.3); put(fx, t, hp(noise(len(tv)), 2500) * np.sin(np.pi * tv / 0.3) ** 2, 0.2)
        put(fx, t + 0.55, thump(140, 0.03, 0.12), 0.25)
    elif name == "bell":
        for i in range(5): put(fx, t + i * 0.085, bell(93, 0.5, 0.12), 0.3 * (1 - i * 0.12), 0.3)
    elif name == "gears":
        for i in range(12): put(fx, t + i * 0.07, woodblock(700 if i % 2 else 520, 0.008), 0.24, 0.3)
    elif name == "tick":
        put(fx, t, woodblock(1900, 0.009), 0.3)
    elif name == "drop":
        put(fx, t, chirp(1500, 320, 0.5), 0.2)
    elif name == "plank":
        k = count["plank"]; count["plank"] += 1
        put(fx, t, marimba(PENTA[k % 9], 0.35), 0.4, 0.2 + k * 0.07)
    elif name == "shield":
        d = 1.2; tv = tt(d); s = sum(np.sin(2*np.pi*np.cumsum(f0 * (1 + tv / d)) / SR) for f0 in (330, 415, 495))
        put(fx, t, s / 3 * np.sin(np.pi * tv / d) * (0.75 + 0.25 * np.sin(2*np.pi*9*tv)), 0.26)
        put(fx, t, bp(noise(len(tv)), 3000, 9000) * np.sin(np.pi * tv / d) ** 2, 0.1)
    elif name == "cheer":
        for i, m in enumerate((72, 76, 79, 84)): put(fx, t + i * 0.09, pluck(m, 0.7, 1.8), 0.34, (i - 1.5) * 0.3)
        tv = tt(1.6); put(fx, t + 0.36, hp(noise(len(tv)), 4500) * np.exp(-tv / 0.4), 0.2)
    elif name == "stamp":
        put(fx, t, thump(65, 0.09), 0.95); tv = tt(0.12); put(fx, t, lp(noise(len(tv)), 1800) * np.exp(-tv / 0.025), 0.7)
    elif name == "logo":
        for i, m in enumerate((60, 67, 72, 76, 79)): put(fx, t + i * 0.12, bell(m, 2.2, 0.8), 0.2, (i - 2) * 0.3)
    elif name == "hit":
        put(fx, t, thump(55, 0.2, 0.7), 0.6); tv = tt(0.8); put(fx, t, hp(noise(len(tv)), 4200) * np.exp(-tv / 0.2), 0.14)
    else:
        raise SystemExit(f"story.js 用了沒定義的音效：{name}")

for e in SFX: sfx(e["name"], e["t"])
fx = fx + 0.15 * (reverb(fx, wet=1.0, tau=0.25, length=1.0) - fx)

def write(name, x, peak):
    x = x / np.max(np.abs(x)) * peak
    wavfile.write(os.path.join(SP, name), SR, (x * 32767).astype(np.int16))
    print(f"已寫出 {name}  {len(x)/SR:.2f}s")

write("bgm.wav", np.tanh(music * 1.1), 0.85)
write("sfx.wav", fx, 0.85)
print(f"拍速 {TL['bpm']}  格線原點 {G0}s  共 {beats_total} 拍  音效 {len(SFX)} 個")
