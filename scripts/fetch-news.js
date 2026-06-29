// 【修正1】getCategory関数を更新して不要な記事を弾く
function getCategory(title) {
  // 優先的に除外するワード（これらが含まれるとカテゴリ自体を「除外」する）
  if (/エッセイ|広報誌|インタビュー|館長|建築家|にちぎん/.test(title)) return "IGNORE";
  
  if (/金融|政策|金利|為替|ドル円|日銀|FRB|財務省/.test(title)) return "金融・政策";
  if (/再開発|竣工|移転|建設|インフラ|駅前|開発/.test(title)) return "開発・建設";
  if (/マンション|不動産|地価|価格|分譲|住宅/.test(title)) return "不動産市場";
  
  // 上記以外は「その他」ではなく、明示的にカテゴリ不明として処理するか、
  // あるいは今回のように厳格に弾く場合は null を返すようにします
  return "その他";
}

// 【修正2】実行処理内のループを以下に差し替え
(async () => {
  const uniqueNews = [];
  const seenTitles = new Set();

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      feed.items.forEach(item => {
        const cat = getCategory(item.title);
        
        // IGNOREに該当するもの、または日付がおかしいものはスキップ
        if (cat === "IGNORE" || !isValidNews(item)) return;

        const cleanTitle = item.title.replace(/\s*-\s*.*$/, "").trim();
        const normalizedKey = cleanTitle.substring(0, 15).replace(/\s+/g, '');

        if (!seenTitles.has(normalizedKey)) {
          uniqueNews.push({
            title: cleanTitle,
            link: item.link,
            date: new Date(item.pubDate).toISOString(),
            tag: cat, // 判定したカテゴリを格納
            source: extractSource(item, source.name)
          });
          seenTitles.add(normalizedKey);
        }
      });
    } catch (e) { console.error(`Error in ${source.name}: ${e.message}`); }
  }
  // ... (以下保存処理)
})();
