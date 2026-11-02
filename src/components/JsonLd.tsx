// 結構化資料是資料不是程式，用原生 <script> 而不是 next/script。
// `<` 換成 \u003c：內容一旦含有 "</script>" 字樣就會提早結束標籤，變成 XSS 的入口。
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
