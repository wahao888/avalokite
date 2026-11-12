"""把旁白按時間軸擺好，混上配樂與音效，輸出整支影片的聲音軌（audio.m4a）。

三路各自處理：
  旁白  各句對齊後正規化到 -15 LUFS，是整支片子的主角
  配樂  先壓到比旁白低約 10 LU，再被旁白觸發閃避（sidechaincompress）——
        有人說話就再退後一點，句子之間浮上來，但不會浮到跟人聲一樣大
  音效  不閃避，否則跟旁白同時出現的提示聲會被壓到聽不見

最後量整體響度、用「固定增益」推到 -14 LUFS（IG／Reels 播放時對齊的響度）。
不用 loudnorm 的動態模式收尾：它會把沒旁白的空檔拉到跟人聲一樣大，
配樂聽起來就像在一吸一吐。
"""
import json, os, re, subprocess, sys

SP = os.path.dirname(os.path.abspath(__file__))
FF = "/opt/homebrew/bin/ffmpeg"
TL = json.load(open(os.path.join(SP, "timeline.json")))
DUR = TL["total"]
MUSIC_LUFS = float(os.environ.get("MUSIC_LUFS", "-23.5"))   # 配樂閃避前的響度
SFX_VOL = float(os.environ.get("SFX_VOL", "0.42"))        # 音效音量（sfx.wav 的峰值是 0.85）
TARGET = -14.0

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-3000:]); sys.exit(1)
    return r.stderr

def lufs(path):
    """整體響度（EBU R128 的 Integrated）"""
    err = run([FF, "-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"])
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1])

bgm, sfx = os.path.join(SP, "bgm.wav"), os.path.join(SP, "sfx.wav")
music_gain = MUSIC_LUFS - lufs(bgm)

inputs = ["-i", bgm, "-i", sfx]
filters, labels = [], []
for i, v in enumerate(TL["vo"], start=2):
    inputs += ["-i", os.path.join(SP, v["file"])]
    ms = int(round(v["start"] * 1000))
    # 單聲道的 TTS 先轉成立體聲，再整段延遲到它該進來的時間點
    filters.append(f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
                   f"highpass=f=70,adelay={ms}|{ms}[v{i}]")
    labels.append(f"[v{i}]")

filters += [
    f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0,apad,atrim=0:{DUR}[vomix]",
    # 輕壓一下動態再做響度正規化，句子之間的音量比較齊
    "[vomix]acompressor=threshold=0.1:ratio=2.5:attack=8:release=160:makeup=1.5,"
    "loudnorm=I=-15:TP=-2:LRA=7,aresample=44100,asplit=2[vo_mix][vo_key]",
    f"[0:a]volume={music_gain:.2f}dB[bg]",
    "[bg][vo_key]sidechaincompress=threshold=0.045:ratio=3:attack=25:release=500[bgduck]",
    f"[1:a]volume={SFX_VOL}[fx]",
    f"[bgduck][fx][vo_mix]amix=inputs=3:normalize=0,apad,atrim=0:{DUR},asetpts=N/SR/TB[out]",
]

pre = os.path.join(SP, "vo", "premix.wav")
run([FF, "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[out]", "-c:a", "pcm_s24le", pre])
gain = TARGET - lufs(pre)

out = os.path.join(SP, "audio.m4a")
run([FF, "-y", "-i", pre, "-af", f"volume={gain:.2f}dB,alimiter=limit=0.89:attack=3:release=60:level=disabled",
     "-c:a", "aac", "-b:a", "192k", "-ar", "44100", out])
print(f"已寫出 {out}\n配樂增益 {music_gain:+.1f} dB  收尾增益 {gain:+.1f} dB  成品響度 {lufs(out):.1f} LUFS")
