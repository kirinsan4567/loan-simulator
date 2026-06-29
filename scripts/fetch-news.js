import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

const sources = [
  { name: "ロイター・マーケット", url: "https://jp.reuters.com/rss/businessNews" },
  { name: "ダイヤモンド・オンライン", url: "https://diamond.jp/list/feed/rss" },
  { name: "東洋経済", url: "https://toyokeizai.net/list/feed/rss" },
  { name: "市場トレンド", url: "https://news.google.com/rss/search?q=金融政策+金利+不動産+住宅ローン&hl=ja&gl=JP&ceid=JP:ja" },
  { name: "日経（市場ニュース検索）", url: "https://news.google.com/rss/search?q=日経+経済+金融&hl=ja&gl=JP&ceid=JP:ja" },
  { name: "不動産流通研究所", url: "https://www.re-port.net/rss/index.xml" },
  { name: "建通新聞", url: "https://www.kentsu.co.jp/webnews/rss.xml" },
  { name: "新建ハウジング", url: "https://www.s-housing.jp/feed" },
  { name: "住宅新報", url: "https://www.jutaku-s.com/feed" }
];

(async () => {
  let allNews = [];

  for (const source of sources) {
    try {
      console.log(`Fetching: ${source.name}`);
      
      // 3秒でタイムアウトさせる処理
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
      // エラーが発生しても処理を止めずに次へ進む
    }
  }

  const result = allNews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 200);

  if (result.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    fs.writeFileSync("data/news.json", JSON.stringify(result, null, 2));
    console.log(`JSON successfully created with ${result.length} items`);
  } else {
    console.error("No news items found.");
    process.exit(1);
  }
})();
