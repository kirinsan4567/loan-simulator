import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

const sources = [
  { 
    name: "不動産・住宅市況", 
    url: encodeURI("https://news.google.com/rss/search?q=不動産+マンション+住宅ローン+金利+地価+市況&hl=ja&gl=JP&ceid=JP:ja") 
  },
  { 
    name: "都市開発・建設", 
    url: encodeURI("https://news.google.com/rss/search?q=都市開発+再開発+建設+不動産価格&hl=ja&gl=JP&ceid=JP:ja") 
  },
  { 
    name: "日経・経済金融", 
    url: encodeURI("https://news.google.com/rss/search?q=日銀+金融政策+金利+住宅&hl=ja&gl=JP&ceid=JP:ja") 
  }
];

(async () => {
  let allNews = [];

  for (const source of sources) {
    try {
      console.log(`Fetching: ${source.name}`);
      
      const feed = await Promise.race([
        parser.parseURL(source.url),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout (3s)")), 3000))
      ]);
      
      feed.items.forEach(item => {
        allNews.push({
          title: item.title,
          link: item.link,
          date: item.pubDate || new Date().toISOString(),
          tag: source.name
        });
      });
    } catch (e) { 
      console.error(`Error fetching ${source.name}: ${e.message}`);
    }
  }

  // 【修正箇所】result を allNews に書き換えました
  if (allNews.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    
    const output = {
        updatedAt: new Date().toISOString(),
        items: allNews
    };
    
    fs.writeFileSync("data/news.json", JSON.stringify(output, null, 2));
    console.log("JSON successfully created with " + allNews.length + " items");
  } else {
    console.log("No news items were fetched.");
  }
})();
