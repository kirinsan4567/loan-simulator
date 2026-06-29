import Parser from 'rss-parser';
const parser = new Parser();

// 【追加】ここが足りていないのでエラーになっています
const sources = [
  { name: 'ニュースサイトA', url: 'https://example.com/rss1' },
  { name: 'ニュースサイトB', url: 'https://example.com/rss2' }
  // 今まで使っていたRSSのURLと名前をここに入れてください
];

// 【修正1】getCategory関数
function getCategory(title) {
  if (/エッセイ|広報誌|インタビュー|館長|建築家|にちぎん/.test(title)) return "IGNORE";
  
  if (/金融|政策|金利|為替|ドル円|日銀|FRB|財務省/.test(title)) return "金融・政策";
  if (/再開発|竣工|移転|建設|インフラ|駅前|開発/.test(title)) return "開発・建設";
  if (/マンション|不動産|地価|価格|分譲|住宅/.test(title)) return "不動産市場";
  
  return "その他";
}

// 【修正2】実行処理
(async () => {
  const uniqueNews = [];
  const seenTitles = new Set();

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      feed.items.forEach(item => {
        const cat = getCategory(item.title);
        
        // IGNOREに該当するもの、または日付がおかしいものはスキップ
        // ※isValidNewsという関数が別途定義されている前提です
        if (cat === "IGNORE" || !isValidNews(item)) return;

        const cleanTitle = item.title.replace(/\s*-\s*.*$/, "").trim();
        const normalizedKey = cleanTitle.substring(0, 15).replace(/\s+/g, '');

        if (!seenTitles.has(normalizedKey)) {
          uniqueNews.push({
            title: cleanTitle,
            link: item.link,
            date: new Date(item.pubDate).toISOString(),
            tag: cat,
            source: source.name // source.name をそのまま使います
          });
          seenTitles.add(normalizedKey);
        }
      });
    } catch (e) { console.error(`Error in ${source.name}: ${e.message}`); }
  }
  
  // 保存処理 (fs.writeFileSyncなどで保存してください)
})();
