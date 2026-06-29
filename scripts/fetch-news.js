import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser();
const feeds = [
  { url: "https://news.google.com/rss/search?q=日銀+利上げ&hl=ja&gl=JP&ceid=JP:ja", group: "金融政策" },
  { url: "https://news.google.com/rss/search?q=住宅ローン+金利&hl=ja&gl=JP&ceid=JP:ja", group: "ローン金利" },
  { url: "https://news.google.com/rss/search?q=不動産+マンション+開発&hl=ja&gl=JP&ceid=JP:ja", group: "不動産市場" }
];

(async () => {
  const newsMap = new Map(); // URLをキーにして重複を防ぐ

  for (const feedConfig of feeds) {
    const feed = await parser.parseURL(feedConfig.url);
    feed.items.forEach(item => {
      // タイトル整形: 媒体名を削除
      const cleanTitle = item.title.replace(/\s?-\s?[^-]+$/, "");
      if (!newsMap.has(item.link)) {
        newsMap.set(item.link, {
          title: cleanTitle,
          link: item.link,
          date: item.pubDate,
          category: feedConfig.group
        });
      }
    });
  }

  const sortedNews = Array.from(newsMap.values())
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 30); // 過去30件を保持

  // dataフォルダに保存
  if (!fs.existsSync("data")) fs.mkdirSync("data");
  fs.writeFileSync("data/news.json", JSON.stringify(sortedNews, null, 2));
})();
