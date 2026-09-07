export default function NotFound() {
  return (
    <div className="am-wrap">
      <h1 className="am-h1">找不到這個頁面</h1>
      <p className="am-sub">
        商品可能已經下架，或連線檔期已經結束了。
      </p>
      <a className="am-btn am-btn--accent" href="/">
        回到目前的連線
      </a>
    </div>
  );
}
