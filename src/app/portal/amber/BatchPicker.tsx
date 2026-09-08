import { formatTaipei } from "@/lib/tw-time";

// 「這一件要上到哪一檔？」的選擇畫面。
//
// ⚠ 這個元件存在的理由是一個真實的資料汙染路徑：
//
// 她同時開著韓國與日本兩檔連線，人站在首爾的店裡，按下上架。
// 如果系統替她「猜」一檔（例如取最新開的那一檔），每一件商品都會
// 掛到日本連線底下——而且**不會有任何錯誤**。錯的收單時間、錯的
// 預計到貨日、錯的結單分組、錯的運費，一路要到結單那天才會發現。
//
// 只開一檔的時候不該問（那是最常見的情況，多一次點擊就是多一次點擊）；
// 開兩檔以上的時候**一定要問**。猜錯的成本遠高於多按一下。

export type PickableBatch = {
  id: string;
  title: string;
  defaultDeadlineAt: Date | null;
};

export function BatchPicker({
  title,
  hint,
  batches,
  basePath,
}: {
  title: string;
  hint: string;
  batches: PickableBatch[];
  /** 選好之後要去的路徑，會自動接上 ?batch=<id> */
  basePath: string;
}) {
  return (
    <main className="p-wrap">
      <div className="p-head">
        <div>
          <h1 className="p-title">{title}</h1>
          <p className="p-sub">{hint}</p>
        </div>
        <div className="p-actions">
          <a className="p-btn p-btn-ghost" href="/portal/amber">
            回連線管理
          </a>
        </div>
      </div>

      <div className="p-dg-pick">
        {batches.map((b) => (
          <a
            key={b.id}
            className="p-dg-pick__item"
            href={`${basePath}?batch=${encodeURIComponent(b.id)}`}
          >
            <span className="p-dg-pick__title">{b.title}</span>
            <span className="p-dg-pick__meta">
              {b.defaultDeadlineAt ? `收單 ${formatTaipei(b.defaultDeadlineAt)}` : "不設收單"}
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
