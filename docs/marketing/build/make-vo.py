import subprocess, json, re, os, sys
SP = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(SP, "vo"); os.makedirs(VO, exist_ok=True)
VOICE = "Meijia"
BASE_RATE = 175          # say 的預設語速
MAX_SPEEDUP = 1.08       # 旁白要沉穩，只允許微調；塞不下就是稿子該縮短

# (編號, 進場秒數, 可用秒數, 稿子)  ─ 對應 promo-reel.html 的八幕
LINES = [
    (1,  0.35, 2.05, "你們公司有網站嗎？"),
    (2,  2.95, 3.55, "名片沒人記得，網路上也查不到你。"),
    (3,  7.20, 5.10, "阿瓦羅幫你做一支會成交的形象官網。"),
    (4, 13.00, 5.70, "Google 搜得到你，客戶的聯絡方式自動進後台。"),
    (5, 19.40, 4.50, "建置費三萬九，這一檔零元。月費兩千全包。"),
    (6, 24.60, 4.50, "而且網站上線、你點頭之後，月費才開始跑。"),
    (7, 29.80, 4.50, "本檔只開五席，十一月三十號截止。"),
    (8, 35.00, 3.40, "現在就上阿瓦羅官網，鎖定名額。"),
]

def dur(path):
    out = subprocess.run(["afinfo", path], capture_output=True, text=True).stdout
    m = re.search(r"estimated duration: ([\d.]+)", out)
    return float(m.group(1))

def synth(text, path, rate):
    subprocess.run(["say", "-v", VOICE, "-r", str(rate), "-o", path, text], check=True)
    return dur(path)

manifest = []
for n, start, budget, text in LINES:
    path = os.path.join(VO, f"line{n:02d}.aiff")
    d = synth(text, path, BASE_RATE)
    rate, note = BASE_RATE, "原速"
    if d > budget:
        need = min(d / budget, MAX_SPEEDUP)
        rate = round(BASE_RATE * need)
        d = synth(text, path, rate)
        note = f"加速至 {rate} wpm"
    manifest.append({"n": n, "start": start, "budget": budget, "dur": round(d, 2),
                     "rate": rate, "fits": d <= budget + 0.05, "note": note, "text": text})
    flag = "OK " if d <= budget + 0.05 else "超時"
    print(f"{flag} 第{n}句 {start:5.2f}s 起 需 {d:4.2f}s / 可用 {budget:4.2f}s  {note}")

json.dump(manifest, open(os.path.join(VO, "manifest.json"), "w"), ensure_ascii=False, indent=1)
over = [m for m in manifest if not m["fits"]]
print("\n全部塞得進去" if not over else f"\n仍有 {len(over)} 句超時，稿子需要再縮短：{[m['n'] for m in over]}")
