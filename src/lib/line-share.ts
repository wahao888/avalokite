// 分享到 LINE。純函式、零相依，前台後台共用。
//
// LINE 的分享 scheme：https://line.me/R/msg/text/?<URL 編碼過的文字>
// 手機上會直接開 LINE 的「傳送給…」選單（選群組或個人），桌機上開 line.me。
//
// 這件事在手機上是「一鍵」對「複製→切換 App→貼上→送出」四步的差別，
// 而 Amber 每上一檔連線就要分享一次、她的客人每收到一張結單也可能要傳給自己。

/** LINE 對單則訊息的長度有限制，超過會被截斷。留一點餘裕 */
export const LINE_TEXT_MAX = 900;

/**
 * 組出分享連結。
 * 太長的文字會被截斷並補上省略號——寧可少幾行字，也不要讓連結被切掉
 * （連結通常放在最後，被截掉就整則訊息失去意義）。
 */
export function lineShareUrl(text: string, url?: string): string {
  const tail = url ? `\n${url}` : "";
  const room = LINE_TEXT_MAX - tail.length;

  let body = text;
  if (body.length > room) body = body.slice(0, Math.max(0, room - 1)) + "…";

  return `https://line.me/R/msg/text/?${encodeURIComponent(body + tail)}`;
}

/**
 * 「傳給自己」用的文字。
 *
 * 台灣人很習慣把重要連結用 LINE 傳給自己或存進 Keep——這比記住
 * 「訂單編號 + 手機」實際得多，也不必發簡訊或做 LINE Login。
 */
export const keepForMeText = (siteName: string): string =>
  `【${siteName}】我的訂單連結，之後查訂單、看金額、回報匯款都從這裡進去 👇`;
