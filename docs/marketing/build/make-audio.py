"""把八句旁白按分鏡時間擺好，混上背景襯底，輸出整支影片的聲音軌。

旁白一律壓到 -16 LUFS（社群平台的慣用響度），背景則用 sidechaincompress
被旁白觸發閃避——沒有這一步，襯底會蓋住人聲，或是得把背景調到幾乎聽不見。
"""
import json, os, subprocess, sys

SP = os.path.dirname(os.path.abspath(__file__))
FF = "/opt/homebrew/bin/ffmpeg"
manifest = json.load(open(os.path.join(SP, "vo", "manifest.json")))
DUR = 38.6

inputs, filters, labels = ["-i", os.path.join(SP, "bgm.wav")], [], []
for i, m in enumerate(manifest, start=1):
    inputs += ["-i", os.path.join(SP, "vo", f"line{m['n']:02d}.aiff")]
    ms = int(round(m["start"] * 1000))
    # 單聲道的 TTS 先轉成立體聲，再整段延遲到它該進來的時間點
    filters.append(f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
                   f"adelay={ms}|{ms}[v{i}]")
    labels.append(f"[v{i}]")

filters.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0[vomix]")
filters.append("[vomix]loudnorm=I=-16:TP=-1.5:LRA=11[vo]")
filters.append("[vo]asplit=2[vo_mix][vo_key]")          # 一路進混音，一路當閃避的觸發訊號
filters.append("[0:a]volume=0.85[bg]")
filters.append("[bg][vo_key]sidechaincompress=threshold=0.03:ratio=8:attack=15:release=350[bgduck]")
filters.append("[bgduck][vo_mix]amix=inputs=2:normalize=0[mixed]")
filters.append(f"[mixed]alimiter=limit=0.95,apad,atrim=0:{DUR},asetpts=N/SR/TB[out]")

out = os.path.join(SP, "audio.m4a")
cmd = [FF, "-y", *inputs, "-filter_complex", ";".join(filters),
       "-map", "[out]", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", out]
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    sys.stderr.write(r.stderr[-3000:]); sys.exit(1)

info = subprocess.run(["/opt/homebrew/bin/ffprobe", "-v", "error", "-show_entries",
                       "format=duration,bit_rate", "-of", "default=nw=1", out],
                      capture_output=True, text=True).stdout.strip()
print(f"已寫出 {out}\n{info}")
