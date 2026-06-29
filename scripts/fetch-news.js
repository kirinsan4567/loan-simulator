import fs from "fs";
import Parser from "rss-parser";

// ブラウザのフリをしてアクセスするための設定
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

// 1. ここにキーワードを定義
const keywords = [
  "住宅ローン", "日銀", "金融政策", "金利", "地価", "不動産価格", 
  "市況", "マンション", "タワマン", "新築", "住宅", "建設", 
  "賃貸", "不動産", "都市開発"
];

// ニュースソースのリスト
const sources = [
  { name: "ロイター・マーケット", url: "https://jp.reuters.com/rss/businessNews" },
  { name: "ダイヤモンド・オンライン", url: "https://diamond.jp/list/feed/rss" },
  { name: "東洋経済", url: "https://toyokeizai.net/list/feed/rss" },
  // Google検索で「金融政策 金利 不動産」を拾う
  { name: "市場トレンド", url: "https://news.google.com/rss/search?q=金融政策+金利+不動産+住宅ローン&hl=ja&gl=JP&ceid=JP:ja" },
  { name: "日経（市場ニュース検索）", url: "https://news.google.com/rss/search?q=日経+経済+金融&hl=ja&gl=JP&ceid=JP:ja" },
  { name: "不動産流通研究所", url: "https://www.re-port.net/rss/index.xml" },
  { name: "建通新聞", url: "https://www.kentsu.co.jp/webnews/rss.xml" },
  { name: "新建ハウジング", url: "https://www.s-housing.jp/feed" },
  { name: "住宅新報", url: "https://www.jutaku-s.com/feed" }
];

(async () => {
  let allNews = [];

// fetch-news.js 内のループ部分を書き換え
for (const source of sources) {
  try {
    const feed = await parser.parseURL(source.url);
    // 取得件数を制限せず、すべて push する
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

// ソートと保存（件数制限を 50 → 200 などに増やす）
const result = allNews
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, 200);

  if (result.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    fs.writeFileSync("data/news.json", JSON.stringify(result, null, 2));
    console.log("JSON successfully created with " + result.length + " items");
  } else {
    console.error("No news items found.");
    process.exit(1);
  }
})();
