import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

// ★ 1. ここに分類関数を置く
function getCategory(title) {
  if (title.includes("日銀") || title.includes("金利") || title.includes("金融")) return "金融政策";
  if (title.includes("マンション") || title.includes("地価") || title.includes("不動産")) return "不動産市場";
  if (title.includes("建設") || title.includes("再開発")) return "開発・建設";
  return "その他";
}

const sources = [
  // --- 1. 専門サイト指定（ノイズ排除・高信頼度）---
  { 
    name: "ブルームバーグ不動産", 
    url: encodeURI("https://news.google.com/rss/search?q=site:bloomberg.co.jp+不動産+金利+マンション+地価+市況&hl=ja&gl=JP&ceid=JP:ja") 
  },
  { name: "日銀・政策", url: encodeURI("https://news.google.com/rss/search?q=site:boj.or.jp+金融政策+金利+住宅ローン&hl=ja&gl=JP&ceid=JP:ja") },
  { name: "ロイター経済", url: encodeURI("https://news.google.com/rss/search?q=site:reuters.com+日本+不動産+住宅&hl=ja&gl=JP&ceid=JP:ja") },
  { name: "国交省発表", url: encodeURI("https://news.google.com/rss/search?q=site:mlit.go.jp+不動産+住宅+地価+統計&hl=ja&gl=JP&ceid=JP:ja") },
  { name: "住宅新報", url: encodeURI("https://news.google.com/rss/search?q=site:jutaku-s.com+ニュース&hl=ja&gl=JP&ceid=JP:ja") },

  // --- 2. 広範囲キーワード検索（カバレッジ補完）---
  { 
    name: "不動産・住宅市況", 
    url: encodeURI("https://news.google.com/rss/search?q=不動産+マンション+住宅ローン+金利+地価+市況&hl=ja&gl=JP&ceid=JP:ja") 
  },
  { 
    name: "都市開発・建設", 
    url: encodeURI("https://news.google.com/rss/search?q=都市開発+再開発+建設+不動産価格&hl=ja&gl=JP&ceid=JP:ja") 
  },
  { 
    name: "経済金融", 
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
      
      // feed.items.forEach の中身を以下のように修正
　　　feed.items.forEach(item => {
 　　　 allNews.push({
   　　　 title: item.title,
   　　　 link: item.link,
   　　　 // 公開日がある場合はそれを、なければ現在時刻を代入
  　　　  date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('ja-JP') : "日付不明",
  　　　  tag: source.name // これが分類になります
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
