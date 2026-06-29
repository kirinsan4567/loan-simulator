import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser();

// ニュースソースのリスト
const sources = [
  { name: "Yahooビジネス", url: "https://news.yahoo.co.jp/rss/topics/business.xml" },
  { name: "不動産流通研究所", url: "https://www.re-port.net/rss/index.xml" }
];

(async () => {
  let allNews = [];

  for (const source of sources) {
    try {
      console.log(`Fetching: ${source.name}`);
      const feed = await parser.parseURL(source.url);
      
      feed.items.forEach(item => {
        allNews.push({
          title: item.title,
          link: item.link,
          date: item.pubDate || new Date().toISOString(),
          tag: source.name
        });
      });
    } catch (e) {
      console.error(`Error fetching ${source.name}:`, e);
    }
  }

  // 日付でソートして最新50件を抽出
  const result = allNews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50);

  if (result.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    fs.writeFileSync("data/news.json", JSON.stringify(result, null, 2));
    console.log("JSON successfully created with " + result.length + " items");
  } else {
    console.error("No news items found.");
    process.exit(1);
  }
})();
