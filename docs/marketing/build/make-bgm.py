"""合成短片的背景襯底。

刻意自己合成而不是找現成音樂：這支影片會放上 IG/FB/TikTok，用來路不明的
配樂會被平台的版權偵測靜音或限流。和弦切換點直接對齊八幕的進場時間，
剪輯上聽起來就像音樂跟著畫面走。要換成授權音樂時替換 bgm.wav 即可。
"""
import math, struct, wave, os

SR = 44100
DUR = 38.6
SP = os.path.dirname(os.path.abspath(__file__))

# 和弦切換點＝八幕的進場秒數；A 小調，第 3、8 幕轉亮（解法出現／收尾）
CHORDS = [
    (0.00, [220.00, 261.63, 329.63]),  # Am  痛點
    (2.60, [174.61, 220.00, 261.63]),  # F
    (6.80, [261.63, 329.63, 392.00]),  # C   解法登場，轉亮
    (12.60, [196.00, 246.94, 293.66]), # G
    (19.00, [220.00, 261.63, 329.63]), # Am  價格衝擊
    (24.20, [174.61, 220.00, 261.63]), # F   解除風險
    (29.40, [196.00, 246.94, 293.66]), # G   懸而未決＝急迫
    (34.60, [261.63, 329.63, 392.00]), # C   收束
]
XFADE = 0.7          # 和弦交接的淡化長度
PULSE_BPM = 75
N = int(DUR * SR)

def pad(t, freqs, detune):
    """柔和的墊底音色：基頻＋兩個低量泛音，避免數位感的尖銳"""
    v = 0.0
    for f in freqs:
        f = f * detune
        v += math.sin(2*math.pi*f*t) + 0.35*math.sin(2*math.pi*2*f*t) + 0.12*math.sin(2*math.pi*3*f*t)
    return v / (len(freqs) * 1.47)

def chord_gain(t, i):
    """相鄰和弦交叉淡入淡出，換和弦時不會有接縫"""
    start = CHORDS[i][0]
    end = CHORDS[i+1][0] if i+1 < len(CHORDS) else DUR
    if t < start - XFADE or t > end + XFADE: return 0.0
    g = 1.0
    if t < start: g = min(g, (t - (start - XFADE)) / XFADE)
    if t > end - XFADE: g = min(g, max(0.0, (end + XFADE - t) / (2*XFADE)))
    return max(0.0, g)

left, right = [], []
pulse_period = 60.0 / PULSE_BPM
for n in range(N):
    t = n / SR
    l = r = 0.0
    for i, (_, freqs) in enumerate(CHORDS):
        g = chord_gain(t, i)
        if g <= 0: continue
        l += g * pad(t, freqs, 1.0)
        r += g * pad(t, freqs, 1.0012)   # 右聲道微調音，做出自然的寬度

    # 低頻脈動：第二幕才進來，讓開場的沉默更空
    if t > 2.6:
        ph = (t - 2.6) % pulse_period
        if ph < 0.28:
            env = (1 - ph/0.28) ** 2.5
            sub = 0.085 * env * math.sin(2*math.pi*55*t)
            l += sub; r += sub

    # 整體音量：開場淡入、價格那一段推起來、結尾收掉
    amp = 0.16
    if t < 1.5: amp *= t / 1.5
    if 19.0 <= t < 24.2: amp *= 1.5
    if t > DUR - 1.8: amp *= max(0.0, (DUR - t) / 1.8)

    left.append(l * amp); right.append(r * amp)

peak = max(max(abs(v) for v in left), max(abs(v) for v in right))
norm = 0.72 / peak if peak > 0 else 1.0   # 留 headroom 給旁白

out = os.path.join(SP, "bgm.wav")
with wave.open(out, "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b"".join(
        struct.pack("<hh", int(max(-1, min(1, l*norm))*32767), int(max(-1, min(1, r*norm))*32767))
        for l, r in zip(left, right)))
print(f"已寫出 {out}  長度 {DUR}s  峰值正規化係數 {norm:.2f}")
