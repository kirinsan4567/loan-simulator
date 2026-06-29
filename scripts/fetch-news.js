// ... (前略：インポートやソース定義などは同じ)

(async () => {
  let allNews = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      feed.items.forEach(item => {
        allNews.push({
          title: item.title,
          link: item.link,
          date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('ja-JP') : "日付不明",
          tag: getCategory(item.title),
          source: source.name // ソース名を追加
        });
      });
    } catch (e) { console.error(`Error in ${source.name}: ${e.message}`); }
  }

  // 【修正】ご指示いただいたロジックをそのまま適用
  const uniqueNews = [];
  const seenTitles = new Set();

  allNews.forEach(item => {
    // 冒頭20文字で重複判定するロジック
    const baseTitle = item.title.substring(0, 20).replace(/\s+/g, '');
    
    if (!seenTitles.has(baseTitle)) {
      uniqueNews.push(item);
      seenTitles.add(baseTitle);
    }
  });

  // 保存（ここは元の通り）
  if (uniqueNews.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    const output = {
      updatedAt: new Date().toISOString(),
      items: uniqueNews
    };
    fs.writeFileSync("data/news.json", JSON.stringify(output, null, 2));
  }
})();
