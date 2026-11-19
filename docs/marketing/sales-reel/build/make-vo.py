"""錄旁白，並由旁白的實際長度反推整支影片的時間軸。

為什麼時間軸由這支腳本產生，而不是手寫在 reel.html 裡：
上一支短片是先定好每一幕幾秒、再把旁白「壓」進去，稿子一改就得整支重對。
這裡反過來——每一幕的長度＝這一幕的旁白唸完需要多久，再加上進場與收尾的留白。
改稿只要重跑，畫面、字幕、配樂的時間點會一起跟著動。

輸出：
  vo/<scene>-<n>.mp3   每句旁白
  timeline.json        給 make-bgm.py / make-audio.py 讀
  timeline.js          給 reel.html 讀（file:// 下不能 fetch JSON，所以多寫一份 JS）

語音用 Microsoft Edge 的線上神經語音（edge-tts），台灣口音、語氣比 macOS 內建的
美佳自然得多。需要網路；`pip install edge-tts`。
"""
import asyncio, json, os, re, subprocess, sys
import edge_tts

SP = os.path.dirname(os.path.abspath(__file__))
VO = os.path.join(SP, "vo"); os.makedirs(VO, exist_ok=True)

VOICE = os.environ.get("VOICE", "zh-TW-HsiaoChenNeural")   # 曉臻：台灣口音女聲（Barry 試聽後選定）。另有 HsiaoYu（女）、YunJhe（男）
RATE = os.environ.get("RATE", "+14%")    # 業務向要輕快；再快字會黏在一起

# 配樂的拍子。第二幕起每一幕的進場點都貼齊「半小節」，剪接點才會落在拍子上
BPM = 120
BEAT = 60 / BPM
SNAP = BEAT          # 節奏快，每一幕貼齊到一拍就好

# 每一幕：
#   lead   進場後多久旁白才開口（讓畫面先站穩）
#   tail   旁白講完後畫面再留多久
#   gap    同一幕兩句旁白之間的停頓
#   lines  text 是唸的稿子；caps 是字幕的分段，*星號* 包住的字上強調色、~波浪號~ 上警示色
#   cues   「某個詞被唸到的那一刻」——reel.html 裡用 data-at="@名稱" 對齊畫面
SCENES = [
    dict(id="hook", lead=0.35, tail=0.45, gap=0.3, lines=[
        dict(text="客戶說：「我再考慮看看。」",
             caps=["客戶說", "「我再考慮看看」"]),
        dict(text="其實，他轉身就去 Google 你了。",
             caps=["其實", "他轉身就去 *Google 你*了"]),
    ], cues=dict(think="我再", actually="其實", google="Google")),

    dict(id="empty", lead=0.3, tail=0.5, gap=0.3, lines=[
        dict(text="結果，什麼都查不到。",
             caps=["結果", "~什麼都查不到~"]),
        dict(text="查不到的業務，客戶怎麼敢買？",
             caps=["查不到的業務", "客戶~怎麼敢買~？"]),
    ], cues=dict(result="結果", nothing="什麼都", who="查不到的業務", dare="客戶怎麼")),

    dict(id="trio", lead=0.3, tail=0.5, gap=0.3, lines=[
        dict(text="名片會被丟掉，LINE 會被洗掉，只有網站，二十四小時都在。",
             caps=["名片~會被丟掉~", "LINE ~會被洗掉~", "只有網站", "*二十四小時*都在"]),
    ], cues=dict(card="名片", line="LINE會", site="只有網站", allday="二十四")),

    dict(id="turn", lead=0.3, tail=0.55, gap=0.3, lines=[
        dict(text="業務靠的是信任，讓阿瓦羅幫你做一個形象官網！",
             caps=["業務靠的是*信任*", "讓*阿瓦羅*幫你做一個形象官網！"]),
    ], cues=dict(trust="信任", avalo="阿瓦羅", site="形象官網")),

    dict(id="link", lead=0.3, tail=0.45, gap=0.3, lines=[
        dict(text="一個連結，你是誰、賣什麼、做過什麼，一次講清楚。",
             caps=["一個連結", "你是誰、賣什麼、做過什麼", "*一次講清楚*"]),
    ], cues=dict(link="一個連結", who="你是誰", sell="賣什麼", did="做過什麼", clear="一次")),

    dict(id="proof", lead=0.3, tail=0.45, gap=0.3, lines=[
        dict(text="成交案例、客戶好評排一排，讓證據幫你說話。",
             caps=["成交案例、客戶好評排一排", "讓*證據*幫你說話"]),
    ], cues=dict(cases="成交", reviews="客戶好評", evidence="讓證據")),

    dict(id="leads", lead=0.3, tail=0.5, gap=0.3, lines=[
        dict(text="客戶看完，一鍵加 LINE、留資料，名單直接寄給你。",
             caps=["客戶看完", "一鍵加 LINE、留資料", "*名單*直接寄給你"]),
    ], cues=dict(read="客戶看完", tap="一鍵", form="留資料", lead="名單")),

    dict(id="case", lead=0.3, tail=0.55, gap=0.3, lines=[
        dict(text="像這位外送平台合作顧問的網站，天天都在接新的店家諮詢。",
             caps=["像這位外送平台合作顧問的網站", "天天都在接*新的店家諮詢*"]),
    ], cues=dict(site="像這位", daily="天天")),

    dict(id="offer", lead=0.3, tail=0.6, gap=0.3, lines=[
        dict(text="全客製、含上線，三萬九起，價格全部公開透明。",
             caps=["全客製、含上線", "*三萬九*起", "價格全部*公開透明*"]),
    ], cues=dict(custom="全客製", live="含上線", price="三萬九", open="價格全部")),

    dict(id="cta", lead=0.3, tail=2.6, gap=0.3, lines=[
        dict(text="下次客戶說再考慮看看，讓他先看到你的網站！",
             caps=["下次客戶說再考慮看看", "讓他先看到*你的網站*！"]),
        dict(text="加 LINE，免費諮詢！",
             caps=["加 LINE，*免費諮詢*！"]),
    ], cues=dict(next="下次", yours="你的網站", add="加LINE", free="免費")),
]

PUNCT = re.compile(r"[\s，。、？！,.!?*~：:；;「」『』（）()—\-]")
norm = lambda s: PUNCT.sub("", s)


async def synth(text, path):
    """回傳逐詞邊界 [(起, 迄, 詞)]，並把音檔寫到 path"""
    words = []
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary="WordBoundary")
    with open(path, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    return words


def char_times(text, words):
    """把逐詞邊界攤成逐字的 (起, 迄)。對不上就退回按字數等分。"""
    n = len(norm(text))
    out = []
    for a, b, w in words:
        k = len(norm(w))
        for i in range(k):
            out.append((a + (b - a) * i / k, a + (b - a) * (i + 1) / k))
    if len(out) != n:
        a, b = (words[0][0], words[-1][1]) if words else (0.1, 0.1 + n * 0.25)
        print(f"  ⚠ 逐詞邊界與稿子字數對不上（{len(out)} vs {n}），這句改用等分：{text}", file=sys.stderr)
        out = [(a + (b - a) * i / n, a + (b - a) * (i + 1) / n) for i in range(n)]
    return out


async def main():
    scenes, captions, vo = [], [], []
    t = 0.0
    grid0 = None                       # 第二幕的進場時間＝節拍格線的原點
    for si, sc in enumerate(SCENES):
        start = t
        cur = start + sc["lead"]
        chars_abs, text_all = [], ""   # 整幕串起來的逐字時間，給 cue 查
        for li, ln in enumerate(sc["lines"]):
            path = os.path.join(VO, f"{sc['id']}-{li+1}.mp3")
            words = await synth(ln["text"], path)
            ct = char_times(ln["text"], words)
            assert norm("".join(ln["caps"])) == norm(ln["text"]), f"字幕分段與稿子不一致：{ln['text']}"
            vo.append(dict(file=os.path.relpath(path, SP), start=round(cur, 3), text=ln["text"]))
            # 字幕：每段從第一個字開口到最後一個字收音
            i = 0
            line_caps = []
            for cap in ln["caps"]:
                k = len(norm(cap))
                line_caps.append([cur + ct[i][0], cur + ct[i + k - 1][1], cap])
                i += k
            for j, c in enumerate(line_caps):
                nxt = line_caps[j + 1][0] if j + 1 < len(line_caps) else None
                # 段與段之間不留空白閃爍；最後一段多停一下讓人讀完
                c[1] = nxt if nxt is not None else c[1] + 0.35
                captions.append(dict(start=round(c[0] - 0.06, 3), end=round(c[1], 3), text=c[2]))
            chars_abs += [(cur + a, cur + b) for a, b in ct]
            text_all += norm(ln["text"])
            cur += ct[-1][1] + sc["gap"]
        end = cur - sc["gap"] + sc["tail"]
        if si >= 1:
            if grid0 is None: grid0 = start
            # 下一幕的進場點貼齊半小節
            n = -(-(end - grid0) // SNAP)
            end = grid0 + n * SNAP
        cues = {}
        for name, key in sc.get("cues", {}).items():
            idx = text_all.find(norm(key))
            assert idx >= 0, f"cue「{key}」不在第 {sc['id']} 幕的稿子裡"
            cues[name] = round(chars_abs[idx][0] - start, 3)
        cues["voEnd"] = round(chars_abs[-1][1] - start, 3)
        scenes.append(dict(id=sc["id"], start=round(start, 3), dur=round(end - start, 3), cues=cues))
        print(f"{sc['id']:10s} {start:6.2f}s 起  長 {end-start:5.2f}s   " +
              "  ".join(f"{k}@{v:.2f}" for k, v in cues.items()))
        t = end

    tl = dict(total=round(t, 3), bpm=BPM, grid0=round(grid0, 3), voice=VOICE, rate=RATE,
              scenes=scenes, captions=captions, vo=vo)
    json.dump(tl, open(os.path.join(SP, "timeline.json"), "w"), ensure_ascii=False, indent=1)
    with open(os.path.join(SP, "timeline.js"), "w") as f:
        f.write("// 由 make-vo.py 產生，請勿手改\nwindow.TL = " + json.dumps(tl, ensure_ascii=False, indent=1) + ";\n")
    print(f"\n總長 {t:.2f}s  語音 {VOICE} {RATE}")

asyncio.run(main())
