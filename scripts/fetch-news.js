import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser();
const themes = ["不動産", "金利", "住宅ローン", "日銀", "景気", "マンション", "都市開発"];

(async () => {
  const newsMap = new Map();
  for (const theme of themes) {
    const url = `https://news.google.com/rss/search?q=${theme}&hl=ja&gl=JP&ceid=JP:ja`;
    const feed = await parser.parseURL(url);
    feed.items.forEach(item => {
      if (!newsMap.has(item.link)) {
        newsMap.set(item.link, {
          title: item.title.replace(/\s?-\s?[^-]+$/, ""),
          link: item.link,
          date: item.pubDate,
          tag: theme
        });
      }
    });
  }
  const sorted = Array.from(newsMap.values()).slice(0, 50);
  fs.writeFileSync("data/news.json", JSON.stringify(sorted, null, 2));
})();
