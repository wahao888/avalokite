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
RATE = os.environ.get("RATE", "+6%")     # 廣告要有一點精神，但再快就會像在趕

# 配樂的拍子。第二幕起每一幕的進場點都貼齊「半小節」，剪接點才會落在拍子上
BPM = 104
BEAT = 60 / BPM
SNAP = 2 * BEAT

# 每一幕：
#   lead   進場後多久旁白才開口（讓畫面先站穩）
#   tail   旁白講完後畫面再留多久
#   gap    同一幕兩句旁白之間的停頓
#   lines  text 是唸的稿子；caps 是字幕的分段，*星號* 包住的字上強調色、~波浪號~ 上警示色
#   cues   「某個詞被唸到的那一刻」——reel.html 裡用 data-at="@名稱" 對齊畫面
SCENES = [
    dict(id="night", lead=0.9, tail=0.9, gap=0.5, lines=[
        dict(text="晚上十一點半，你的 LINE 又響了。",
             caps=["晚上十一點半", "你的 LINE *又響了*"]),
        dict(text="可是你早就下班了。等到明天再回，客人已經去找別家了。",
             caps=["可是你早就下班了", "等到明天再回", "客人已經~去找別家了~"]),
    ], cues=dict(ring="又響了", off="可是", tomorrow="等到明天", gone="客人已經")),

    dict(id="reply", lead=0.9, tail=0.9, gap=0.4, lines=[
        dict(text="現在，交給阿瓦羅的 AI 智能客服。",
             caps=["現在，交給阿瓦羅的", "*AI 智能客服*"]),
        dict(text="它就住在你的 LINE 官方帳號裡，客人一問，馬上回。",
             caps=["它就住在你的 LINE 官方帳號裡", "客人一問，*馬上回*"]),
    ], cues=dict(ai="AI智能", live="它就住在", ask="客人一問", answer="馬上回")),

    dict(id="always", lead=0.6, tail=0.8, gap=0.4, lines=[
        dict(text="半夜、假日、過年，二十四小時都有人顧。",
             caps=["半夜、假日、過年", "*二十四小時*都有人顧"]),
    ], cues=dict(night="半夜", holiday="假日", newyear="過年", allday="二十四")),

    dict(id="knowledge", lead=0.6, tail=0.9, gap=0.45, lines=[
        dict(text="它讀的是你自己的價目表跟常見問題，有根據才回答。",
             caps=["它讀的是你自己的價目表", "跟常見問題", "*有根據*才回答"]),
        dict(text="不知道的事，它不會亂掰。",
             caps=["不知道的事", "它*不會亂掰*"]),
    ], cues=dict(read="它讀的", price="價目表", faq="常見問題", grounded="有根據",
                 unknown="不知道", nobs="不會亂掰")),

    dict(id="price", lead=0.6, tail=0.9, gap=0.4, lines=[
        dict(text="價格由系統直接帶入，AI 不自己算，所以報價不會算錯。",
             caps=["價格由系統直接帶入", "AI 不自己算", "所以報價*不會算錯*"]),
    ], cues=dict(carry="直接帶入", nocalc="AI不自己", right="不會算錯")),

    dict(id="handoff", lead=0.6, tail=1.0, gap=0.4, lines=[
        dict(text="客人想找真人的時候，它會馬上通知你，然後安靜退到一旁，不跟你搶話。",
             caps=["客人想找真人的時候", "它會*馬上通知你*", "然後安靜退到一旁", "不跟你搶話"]),
    ], cues=dict(human="想找真人", notify="馬上通知", quiet="安靜退到", noclash="不跟你")),

    dict(id="proof", lead=0.6, tail=0.9, gap=0.4, lines=[
        dict(text="而且，阿瓦羅自己的官方 LINE，用的就是這一套。",
             caps=["而且，阿瓦羅自己的官方 LINE", "用的*就是這一套*"]),
    ], cues=dict(own="阿瓦羅自己", same="就是這一套")),

    dict(id="cta", lead=0.6, tail=2.6, gap=0.4, lines=[
        dict(text="現在就加我們的 LINE，親自考考它吧。",
             caps=["現在就加我們的 LINE", "親自*考考它*吧"]),
    ], cues=dict(add="加我們", test="親自")),
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
