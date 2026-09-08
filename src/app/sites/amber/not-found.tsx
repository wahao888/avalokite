import { AmberMark } from "./_components/Logo";
import { IconArrowRight, IconCalendar, IconChevronRight } from "./_components/Icons";

export default function NotFound() {
  return (
    <div className="am-wrap am-wrap--narrow">
      <p className="am-empty" style={{ marginTop: "2rem" }}>
        <AmberMark size={38} stroke={1.3} className="am-empty__i" />
        <strong style={{ display: "block", fontSize: "1.15rem", color: "var(--a-ink)" }}>
          找不到這個頁面
        </strong>
        商品可能已經下架，或連線檔期已經結束了。
      </p>

      <div className="am-btns" style={{ justifyContent: "center", marginTop: "1.2rem" }}>
        <a className="am-btn am-btn--accent" href="/">
          回到目前的連線
          <IconArrowRight size={17} stroke={2} />
        </a>
        <a className="am-btn am-btn--ghost" href="/lineups">
          <IconCalendar size={16} stroke={1.9} />
          連線總覽
        </a>
        <a className="am-btn am-btn--ghost" href="/order/lookup">
          查訂單
          <IconChevronRight size={16} stroke={2} />
        </a>
      </div>
    </div>
  );
}
