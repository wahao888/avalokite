/**
 * 墨跡視差層
 *
 * Hero 的墨流 canvas 會在墨鋪開之後，把當下那張畫面存進 :root 的 --ink-wash，
 * 這個層只負責把它貼出來。沒有 --ink-wash（WebGL 不支援、使用者關掉墨流、
 * 或這個區塊出現在沒有 Hero 的內頁）時 background-image 解析成 none，
 * 整層自然隱形，不需要任何 JS 判斷。
 *
 * 淺色區塊用 multiply 把墨沉進底色（variant 1–3）；深色的服務分鏡區不能 multiply，
 * 改用墨跡的 alpha 當遮罩填一層光（variant 4），細節在 globals.css。
 *
 * 位移交給 InkParallax，手機與 prefers-reduced-motion 下不位移。
 */
export default function InkWash({ variant = 1 }: { variant?: 1 | 2 | 3 | 4 }) {
  return <div className="ink-wash" data-ink={variant} aria-hidden="true" />;
}
