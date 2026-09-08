import type { Metadata } from "next";
import { OrderLookup } from "../../_components/OrderLookup";
import { HelpCta } from "../../_components/Blocks";
import { IconInfo, IconSearch } from "../../_components/Icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "查訂單" };

export default function LookupPage() {
  return (
    <div className="am-wrap am-wrap--narrow">
      <header className="am-pagehead">
        <p className="am-eyebrow">
          <IconSearch size={14} stroke={2} />
          查訂單
        </p>
        <h1>查訂單</h1>
        <p>用訂單編號（或結單編號）加上下單時填的手機就查得到。</p>
      </header>

      <OrderLookup />

      <div className="am-callout">
        <IconInfo size={19} stroke={1.8} />
        <p>
          <strong>編號只要打後 4 碼。</strong>
          完整編號的前半段是我們對帳用的日期，客人不必背。
          如果你手上有下單後拿到的專屬連結，直接點那條連結更快——
          不用輸入任何東西。
        </p>
      </div>

      <HelpCta
        title="編號和連結都不見了？"
        body="在 LINE 上告訴我們你的姓名和手機，我們幫你找。"
      />
    </div>
  );
}
