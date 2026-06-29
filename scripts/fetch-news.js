import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });

// 1. 分類関数
function getCategory(title) {
  // 1. 金融・政策: 金利、政策、日銀、為替など
  if (/金融|政策|金利|為替|ドル円|日銀|FRB|財務省/.test(title)) return "金融・政策";
  
  // 2. 開発・建設: 再開発、竣工、移転、インフラ、駅前など
  if (/再開発|竣工|移転|建設|インフラ|駅前|開発/.test(title)) return "開発・建設";
  
  // 3. 不動産市場: マンション、不動産、地価、価格など
  if (/マンション|不動産|地価|価格|分譲|住宅/.test(title)) return "不動産市場";
  
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

  // 重複排除ロジックの強化
  // タイトル末尾の「 - 配信元名」などを取り除いて比較する
  const uniqueNews = allNews.filter((item, index, self) => {
    const cleanTitle = item.title.replace(/\s*-\s*.*$/, "").trim();
    return index === self.findIndex((t) => {
      const cleanT = t.title.replace(/\s*-\s*.*$/, "").trim();
      return cleanT === cleanTitle;
    });
  });

// 重複排除ロジックの修正
const uniqueNews = [];
const seenTitles = new Set();

items.forEach(item => {
  // タイトルの全文字ではなく、冒頭の20文字程度をキーにする
  // これにより「プレジデントオンライン版」と「Yahoo!版」を同一とみなせる
  const baseTitle = item.title.substring(0, 20).replace(/\s+/g, '');
  
  if (!seenTitles.has(baseTitle)) {
    uniqueNews.push(item);
    seenTitles.add(baseTitle);
  }
});
