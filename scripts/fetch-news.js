import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });

// 1. 分類関数
function getCategory(title) {
  if (title.includes("日銀") || title.includes("金利") || title.includes("金融")) return "金融政策";
  if (title.includes("マンション") || title.includes("地価") || title.includes("不動産")) return "不動産市場";
  if (title.includes("建設") || title.includes("再開発")) return "開発・建設";
  return "その他";
}

// 2. 1週間前の日付を自動生成
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const dateQuery = `after:${oneWeekAgo.toISOString().split('T')[0]}`;

// 3. ソース定義
const sources = [
  { name: "ブルームバーグ不動産", url: encodeURI(`https://news.google.com/rss/search?q=site:bloomberg.co.jp+不動産+金利+マンション+地価+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "日銀・政策", url: encodeURI(`https://news.google.com/rss/search?q=site:boj.or.jp+金融政策+金利+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "ロイター経済", url: encodeURI(`https://news.google.com/rss/search?q=site:reuters.com+日本+不動産+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "国交省発表", url: encodeURI(`https://news.google.com/rss/search?q=site:mlit.go.jp+不動産+住宅+統計+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "不動産市況", url: encodeURI(`https://news.google.com/rss/search?q=不動産+マンション+地価+${dateQuery}+-site:jutaku-s.com&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "金融政策", url: encodeURI(`https://news.google.com/rss/search?q=日銀+金融政策+金利+住宅ローン+${dateQuery}+-site:jutaku-s.com&hl=ja&gl=JP&ceid=JP:ja`) }
];

// 4. 実行処理
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
          tag: getCategory(item.title)
        });
      });
    } catch (e) { console.error(`Error in ${source.name}: ${e.message}`); }
  }

  // 重複排除
  const uniqueNews = allNews.filter((item, index, self) =>
    index === self.findIndex((t) => t.title === item.title)
  );

  // 保存
  if (uniqueNews.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    const output = {
      updatedAt: new Date().toISOString(),
      items: uniqueNews
    };
    fs.writeFileSync("data/news.json", JSON.stringify(output, null, 2));
  }
})();
