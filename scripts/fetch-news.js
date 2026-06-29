import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser();

(async () => {
  const newsList = [];
  // Yahoo!ニュースのRSS URL
  const url = 'https://news.yahoo.co.jp/rss/topics/business.xml';

  try {
    const feed = await parser.parseURL(url);
    feed.items.forEach(item => {
      newsList.push({
        title: item.title,
        link: item.link,
        date: item.pubDate,
        tag: 'ビジネス'
      });
    });
  } catch (e) { 
    console.error(`Error fetching Yahoo news:`, e);
    process.exit(1); 
  }

  const result = newsList.slice(0, 50);
  
  if (result.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    fs.writeFileSync("data/news.json", JSON.stringify(result, null, 2));
    console.log("JSON successfully created");
  } else {
    process.exit(1);
  }
})();
