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

VOICE = os.environ.get("VOICE", "zh-TW-HsiaoChenNeural")   # 另有 HsiaoYu（女）、YunJhe（男）
RATE = os.environ.get("RATE", "+3%")     # 說故事的口吻，比上一支功能介紹慢一點

# 配樂的拍子。第二幕起每一幕的進場點都貼齊「半小節」，剪接點才會落在拍子上
BPM = 112
BEAT = 60 / BPM
SNAP = 2 * BEAT

# 每一幕：
#   lead   進場後多久旁白才開口（讓畫面先站穩）
#   tail   旁白講完後畫面再留多久
#   gap    同一幕兩句旁白之間的停頓
#   lines  text 是唸的稿子；caps 是字幕的分段，*星號* 包住的字上強調色、~波浪號~ 上警示色
#   cues   「某個詞被唸到的那一刻」——reel.html 裡用 data-at="@名稱" 對齊畫面
SCENES = [
    dict(id="lonely", lead=1.3, tail=0.8, gap=0.45, lines=[
        dict(text="阿福的小店，東西很好，卻沒什麼人知道。",
             caps=["阿福的小店", "東西很好", "卻~沒什麼人知道~"]),
    ], cues=dict(good="東西很好", nobody="卻沒什麼")),

    dict(id="arrive", lead=0.5, tail=1.1, gap=0.4, lines=[
        dict(text="直到有一天，阿瓦羅來了。",
             caps=["直到有一天", "*阿瓦羅*來了"]),
    ], cues=dict(oneday="直到", came="阿瓦羅來了")),

    dict(id="website", lead=0.5, tail=0.9, gap=0.4, lines=[
        dict(text="先蓋一個讓人一眼就信任的品牌官網。",
             caps=["先蓋一個讓人一眼就信任的", "*品牌官網*"]),
    ], cues=dict(build="先蓋", trust="一眼", site="品牌官網")),

    dict(id="shop", lead=0.5, tail=0.9, gap=0.4, lines=[
        dict(text="裝上購物車和金流，訂單自己進來。",
             caps=["裝上*購物車和金流*", "訂單自己進來"]),
    ], cues=dict(cart="購物車", pay="金流", order="訂單")),

    dict(id="ai", lead=0.6, tail=0.9, gap=0.4, lines=[
        dict(text="半夜有人問？AI 客服在 LINE 上，馬上回。",
             caps=["半夜有人問？", "*AI 客服*在 LINE 上", "馬上回"]),
    ], cues=dict(ask="半夜", ai="AI客服", reply="馬上回")),

    dict(id="auto", lead=0.5, tail=0.9, gap=0.4, lines=[
        dict(text="報表、通知、重複的流程，交給自動化去跑。",
             caps=["報表、通知、重複的流程", "交給*自動化*去跑"]),
    ], cues=dict(report="報表", notify="通知", flow="重複", run="交給")),

    dict(id="geo", lead=0.5, tail=0.9, gap=0.4, lines=[
        dict(text="讓 Google 找得到你，也讓 AI 讀得懂你。",
             caps=["讓 Google *找得到你*", "也讓 AI *讀得懂你*"]),
    ], cues=dict(google="Google", aiRead="也讓")),

    dict(id="care", lead=0.5, tail=0.9, gap=0.4, lines=[
        dict(text="上線之後，全年都有人替你顧著。",
             caps=["上線之後", "*全年*都有人替你顧著"]),
    ], cues=dict(live="上線", year="全年")),

    dict(id="finale", lead=0.6, tail=0.8, gap=0.5, lines=[
        dict(text="從設計、開發到維運，一個團隊做到好。",
             caps=["從設計、開發到維運", "*一個團隊*做到好"]),
        dict(text="價格全部公開，不二價。",
             caps=["價格全部公開", "*不二價*"]),
    ], cues=dict(team="一個團隊", price="價格", fixed="不二價")),

    dict(id="cta", lead=0.7, tail=3.2, gap=0.4, lines=[
        dict(text="阿瓦羅。你專心做生意，其他的，交給我們。",
             caps=["*阿瓦羅*", "你專心做生意", "其他的，*交給我們*"]),
    ], cues=dict(brand="阿瓦羅", focus="你專心", rest="其他")),
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
    print(f"\n總長 {t:.2f}s（目標 60–90s）  語音 {VOICE} {RATE}")

asyncio.run(main())
