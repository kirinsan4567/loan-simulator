import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser();
const themes = ["不動産", "金利", "住宅ローン", "日銀", "景気", "マンション", "都市開発"];

(async () => {
  const newsMap = new Map();
  for (const theme of themes) {
    const url = `https://news.google.com/rss/search?q=${theme}&hl=ja&gl=JP&ceid=JP:ja`;
    try {
      const feed = await parser.parseURL(url);
      feed.items.forEach(item => {
        const title = item.title.replace(/\s?-\s?[^-]+$/, "");
        if (!newsMap.has(item.link)) {
          newsMap.set(item.link, { title, link: item.link, date: item.pubDate, tag: theme });
        }
      });
    } catch (e) { console.error(`Error fetching ${theme}:`, e); }
  }
  const result = Array.from(newsMap.values()).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
  
  if (!fs.existsSync("data")) fs.mkdirSync("data");
  fs.writeFileSync("data/news.json", JSON.stringify(result, null, 2));
})();
