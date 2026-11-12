"""合成配樂（bgm.wav）與音效（sfx.wav）。

刻意自己合成而不是找現成音樂：這支影片會放上 IG，來路不明的配樂會被平台的
版權偵測靜音或限流。自己合成還有一個好處——節拍格線的原點就是第二幕的進場點，
make-vo.py 又把之後每一幕都貼齊半小節，所以每個剪接點都落在拍子上。

結構跟著劇情走：
  第 1 幕（深夜）  只有低音鋪底和時鐘滴答，結尾一個上揚的掃頻把人帶進下一幕
  第 2–6 幕        C–G–Am–F 的明亮循環，鼓、貝斯、琶音逐層加進來
  第 7 幕（現場）  鼓抽掉，只留鋪底，讓「不是 Demo，是現場」那一句有空間
  第 8 幕（CTA）   全部回來，最後一小節收在主和弦上

音效的時間表不是寫死的：`node render.js --sfx` 會從 reel.html 裡的 data-sfx 讀出來。
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
CH = dict(
    C=dict(bass=36, pad=[48, 55, 60, 64], arp=[60, 64, 67, 72, 76, 72, 67, 64]),
    G=dict(bass=43, pad=[43, 55, 59, 62], arp=[59, 62, 67, 71, 74, 71, 67, 62]),
    Am=dict(bass=45, pad=[45, 57, 60, 64], arp=[60, 64, 69, 72, 76, 72, 69, 64]),
    F=dict(bass=41, pad=[41, 53, 57, 60], arp=[60, 65, 69, 72, 77, 72, 69, 65]),
)
PROG = ["C", "G", "Am", "F"]
MELODY = dict(C=[(0, 76), (1.5, 79), (2.5, 76), (3, 74)], G=[(0, 74), (1.5, 79), (2.5, 74), (3, 71)],
              Am=[(0, 72), (1.5, 76), (2.5, 72), (3, 69)], F=[(0, 69), (1, 72), (2, 77), (3, 76)])

beats_total = int(round((DUR - G0) / BEAT))
b_of = lambda sid: int(round((SC[sid]["start"] - G0) / BEAT))
B_ALWAYS, B_KNOW, B_PRICE, B_HAND, B_PROOF, B_CTA = (b_of(k) for k in ("always", "knowledge", "price", "handoff", "proof", "cta"))
B_END = (beats_total // 4 - 1) * 4          # 最後一小節只留收尾的和弦
T = lambda b: G0 + b * BEAT

drums, low, mid, air = buf(), buf(), buf(), buf()      # air＝要加殘響的那一路
kick_t = []

# 第 1 幕：深夜。低音鋪底＋時鐘滴答
night_end = G0
for det, pan in ((1.0, -0.5), (1.004, 0.5)):
    put(low, 0, pad([33, 45, 52, 57, 60], night_end + 0.6, det), 0.5, pan)
for i in range(int(night_end / 0.5)):
    t = tt(0.05); f = 1500 if i % 2 == 0 else 1150
    put(mid, 0.25 + i * 0.5, np.sin(2*np.pi*f*t) * np.exp(-t / 0.008), 0.11 * min(1, (i + 2) / 6), -0.2 if i % 2 else 0.2)
put(air, G0 - 1.5, swell(1.5), 0.5)
t = tt(1.5); put(air, G0 - 1.5, np.sin(2*np.pi*np.cumsum(180 + 900 * (t / 1.5) ** 2) / SR) * (t / 1.5) ** 2, 0.16)

for b in range(beats_total):
    bar, bb = divmod(b, 4)
    name = PROG[bar % 4] if b < B_END else "C"
    ch = CH[name]
    t0 = T(b)
    ending = b >= B_END
    breakdown = B_PROOF <= b < B_CTA
    build = b < 8                                 # 第二幕的前兩小節：鼓只打一半，讓東西有地方長
    full = not (ending or breakdown)

    if bb == 0:                                   # 鋪底：一小節一個和弦
        d = BEAT * 4 + 0.3 if not ending else DUR - t0
        for det, pan in ((0.997, -0.6), (1.003, 0.6)):
            put(mid, t0, pad(ch["pad"], d, det), 0.30 if not breakdown else 0.4, pan)

    if full:
        if not build or bb in (0, 2):
            put(drums, t0, kick(), 0.95); kick_t.append(t0)
        if not build and bb in (1, 3):
            put(air, t0, clap(), 0.36)
        if not build:
            put(drums, t0 + BEAT / 2, hat(0.05), 0.20, 0.25)
            for k in range(4):
                put(drums, t0 + k * BEAT / 4, hat(0.012), 0.055 + 0.03 * (k % 2), -0.3)
        put(low, t0 + BEAT / 2, bass(ch["bass"], BEAT * 0.5), 0.62)
        if bb == 0: put(low, t0, bass(ch["bass"], BEAT * 0.5), 0.5)

    if not ending:                                # 琶音：平常十六分音符，抽鼓那一段改八分、放輕
        step = 2 if breakdown else 4
        for k in range(step):
            i = (b * step + k) % 8
            put(air, t0 + k * BEAT / step, pluck(ch["arp"][i], 0.45, 1.25 if breakdown else 1.0),
                (0.17 if k % 2 == 0 else 0.11) * (0.8 if breakdown else 1.0), -0.45 if (b * step + k) % 2 else 0.45)

    # 旋律只放在比較空的段落，免得跟旁白搶同一個音域
    melodic = (B_ALWAYS <= b < B_KNOW) or (B_PRICE - 8 <= b < B_PRICE) or (B_CTA <= b < B_END)
    if melodic and bb == 0:
        for off, m in MELODY[name]:
            put(air, t0 + off * BEAT, bell(m, 0.8), 0.13, 0.15)

    if ending and b == B_END:                     # 收尾：一記重拍＋主和弦的鈴音
        put(drums, t0, kick(), 1.0); kick_t.append(t0)
        put(low, t0, bass(36, 1.2), 0.7)
        for i, m in enumerate((72, 76, 79, 84)):
            put(air, t0 + i * 0.045, bell(m, 2.4, 0.8), 0.2, (i - 1.5) * 0.3)
        t = tt(2.0); put(air, t0, hp(noise(len(t)), 5000) * np.exp(-t / 0.5), 0.16)

# 每一幕進場前一拍的吸氣聲；鼓回來之前多一個長的
for sid in ("always", "knowledge", "price", "handoff", "proof"):
    put(air, SC[sid]["start"] - BEAT, swell(BEAT, 2500, 10000), 0.2)
put(air, SC["cta"]["start"] - BEAT * 2, swell(BEAT * 2), 0.42)

# 側鏈：大鼓落下時把鋪底和貝斯壓一下，律動才會「呼吸」
duck = np.ones(N)
env = np.exp(-tt(0.3) / 0.09)
for kt in kick_t:
    i = int(kt * SR); n = min(len(env), N - i)
    duck[i:i+n] = np.minimum(duck[i:i+n], 1 - 0.5 * env[:n])
low *= duck[:, None]; mid *= (0.4 + 0.6 * duck)[:, None]

def echo(x, d, fb=0.3):
    """乒乓延遲：回聲左右交換，撐開琶音的寬度"""
    k = int(d * SR); y = x.copy()
    y[k:, 0] += fb * x[:-k, 1]; y[k:, 1] += fb * x[:-k, 0]
    y[2*k:] += fb * fb * 0.6 * x[:-2*k]
    return y

def reverb(x, wet=0.22, tau=0.42, length=1.7):
    t = tt(length); out = x.copy()
    for c in range(2):
        ir = lp(noise(len(t)), 6500) * np.exp(-t / tau); ir /= np.sqrt(np.sum(ir ** 2))
        out[:, c] += wet * signal.fftconvolve(x[:, c], ir)[:N]
    return out

music = drums + low + mid + reverb(echo(air, BEAT * 0.75))
music[-int(0.5 * SR):] *= np.linspace(1, 0, int(0.5 * SR))[:, None]      # 片尾收乾淨
music[:int(1.0 * SR)] *= np.linspace(0, 1, int(1.0 * SR))[:, None]

# ── 音效 ────────────────────────────────────────────────
fx = buf()
def sfx(name, t):
    if name == "notify":                          # 手機震動＋兩個音的提示聲
        tv = tt(0.26); put(fx, t, bp(noise(len(tv)), 90, 260) * (np.sin(2*np.pi*27*tv) > 0) * np.exp(-tv / 0.2), 0.5)
        put(fx, t + 0.02, bell(79, 0.5, 0.14), 0.42); put(fx, t + 0.13, bell(84, 0.6, 0.18), 0.42)
    elif name == "sad":
        for i, m in enumerate((76, 72, 69)): put(fx, t + i * 0.17, bell(m, 1.2, 0.4), 0.42, -0.1)
    elif name == "ding":
        put(fx, t, bell(88, 0.7, 0.2), 0.26, 0.2); put(fx, t + 0.05, bell(95, 0.7, 0.22), 0.2, 0.2)
    elif name == "pop":
        tv = tt(0.09); f = 420 + 900 * (tv / 0.09)
        put(fx, t, np.sin(2*np.pi*np.cumsum(f) / SR) * np.exp(-tv / 0.03), 0.42)
    elif name == "tick":
        tv = tt(0.05); put(fx, t, np.sin(2*np.pi*1900*tv) * np.exp(-tv / 0.009), 0.3)
    elif name == "lock":
        for i, f in enumerate((2400, 1500)):
            tv = tt(0.06); put(fx, t + i * 0.07, (np.sin(2*np.pi*f*tv) + 0.4 * noise(len(tv))) * np.exp(-tv / 0.008), 0.34)
        put(fx, t + 0.07, bell(84, 0.5, 0.16), 0.3)
    elif name == "stamp":
        tv = tt(0.3); put(fx, t, np.sin(2*np.pi*np.cumsum(60 + 70 * np.exp(-tv / 0.03)) / SR) * np.exp(-tv / 0.09), 0.95)
        tv = tt(0.12); put(fx, t, lp(noise(len(tv)), 1800) * np.exp(-tv / 0.025), 0.7)
    elif name == "deny":
        for i, m in enumerate((52, 49)):
            tv = tt(0.13); put(fx, t + i * 0.13, lp(np.sign(np.sin(2*np.pi*hz(m)*tv)), 900) * np.exp(-tv / 0.08), 0.24)
    elif name == "alert":
        tv = tt(0.3); put(fx, t, bp(noise(len(tv)), 90, 260) * (np.sin(2*np.pi*27*tv) > 0) * np.exp(-tv / 0.22), 0.45)
        for i, m in enumerate((79, 84, 88)): put(fx, t + i * 0.085, bell(m, 0.9, 0.24), 0.4, 0.1)
    elif name in ("hit", "impact"):
        big = name == "impact"
        tv = tt(0.7); put(fx, t, np.sin(2*np.pi*np.cumsum(38 + 70 * np.exp(-tv / 0.08)) / SR) * np.exp(-tv / 0.22), 0.95 if big else 0.6)
        tv = tt(1.6 if big else 0.8); put(fx, t, hp(noise(len(tv)), 4200) * np.exp(-tv / (0.42 if big else 0.2)), 0.3 if big else 0.16)
        if big:
            for i, m in enumerate((72, 79, 84)): put(fx, t + i * 0.03, bell(m, 1.8, 0.6), 0.2, (i - 1) * 0.4)
    elif name == "whoosh":
        d = 0.5; tv = tt(d); x = noise(len(tv)); out = np.zeros(len(tv)); seg = len(tv) // 10
        for i in range(10):                       # 分段換帶通中心頻率，做出由低掃到高的感覺
            fc = 350 * (9 ** (i / 9)); a, b = i * seg, (i + 1) * seg if i < 9 else len(tv)
            out[a:b] = bp(x, fc * 0.7, fc * 1.4)[a:b]
        put(fx, t - 0.28, out * np.sin(np.pi * tv / d) ** 2, 0.4)
    elif name == "rewind":                        # 時鐘快轉：一串愈來愈高、愈來愈密的滴答
        for i in range(14):
            tv = tt(0.04); u = i / 13
            put(fx, t + 1.2 * (u ** 0.7), np.sin(2*np.pi*(900 + 1400 * u)*tv) * np.exp(-tv / 0.007), 0.26, -0.5 + u)
    elif name == "type":
        for i in range(9):
            tv = tt(0.03); put(fx, t + i / 9 + 0.02, (0.6 * noise(len(tv)) + np.sin(2*np.pi*(2100 + 250 * (i % 3))*tv)) * np.exp(-tv / 0.005), 0.22)
    else:
        raise SystemExit(f"reel.html 用了沒定義的音效：{name}")

for e in SFX: sfx(e["name"], e["t"])
fx = fx + 0.6 * (reverb(fx, wet=1.0, tau=0.25, length=1.0) - fx) * 0.25

def write(name, x, peak):
    x = x / np.max(np.abs(x)) * peak
    wavfile.write(os.path.join(SP, name), SR, (x * 32767).astype(np.int16))
    print(f"已寫出 {name}  {len(x)/SR:.2f}s")

write("bgm.wav", np.tanh(music * 1.1), 0.85)
write("sfx.wav", fx, 0.85)
print(f"拍速 {TL['bpm']}  格線原點 {G0}s  共 {beats_total} 拍  音效 {len(SFX)} 個")
