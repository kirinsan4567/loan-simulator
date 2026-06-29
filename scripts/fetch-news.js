import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });

// 1. 分類関数を厳格化
function getCategory(title) {
  // タイトルに「エッセイ」「広報誌」「インタビュー」が含まれる場合は「不要」としてフィルタ対象にする
  if (/エッセイ|広報誌|インタビュー|館長|建築家/.test(title)) return "IGNORE"; 
  
  if (/金融|政策|金利|為替|ドル円|日銀|FRB|財務省/.test(title)) return "金融・政策";
  if (/再開発|竣工|移転|建設|インフラ|駅前|開発/.test(title)) return "開発・建設";
  if (/マンション|不動産|地価|価格|分譲|住宅/.test(title)) return "不動産市場";
  return "その他";
}

// 2. 実行処理内のループ修正
feed.items.forEach(item => {
  const category = getCategory(item.title);
  if (category === "IGNORE") return; // 不要記事はここでスキップ
  
  // フィルタと重複排除を適用
  if (!isValidNews(item)) return;
  // ... 以下同様
});

// 2. ソース名抽出関数（見出しから配信元を分離）
function extractSource(item, defaultName) {
  if (item.source && item.source.title) return item.source.title;
  if (item.title.includes(" - ")) {
    return item.title.split(" - ").pop().trim();
  }
  return defaultName;
}

// 3. 不要ニュースの排除と日付チェック
function isValidNews(item) {
  if (!item.pubDate) return false;
  const date = new Date(item.pubDate);
  // 2026年より前の古い記事は除外
  if (date.getFullYear() < 2026) return false;
  // 株価情報などのノイズ記事を除外
  if (/Stock Price|Latest News|新着情報一覧|検索結果/.test(item.title)) return false;
  return true;
}

const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const dateQuery = `after:${oneWeekAgo.toISOString().split('T')[0]}`;

const sources = [
  { name: "ブルームバーグ", url: encodeURI(`https://news.google.com/rss/search?q=site:bloomberg.co.jp+不動産+金利+マンション+地価+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "日銀", url: encodeURI(`https://news.google.com/rss/search?q=site:boj.or.jp+金融政策+金利+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "ロイター", url: encodeURI(`https://news.google.com/rss/search?q=site:reuters.com+日本+不動産+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "国交省", url: encodeURI(`https://news.google.com/rss/search?q=site:mlit.go.jp+不動産+住宅+統計+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) }
];

(async () => {
  const uniqueNews = [];
  const seenTitles = new Set();

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      feed.items.forEach(item => {
        if (!isValidNews(item)) return;

        // タイトルから配信元を除去
        const cleanTitle = item.title.replace(/\s*-\s*.*$/, "").trim();
        const normalizedKey = cleanTitle.substring(0, 15).replace(/\s+/g, '');

        if (!seenTitles.has(normalizedKey)) {
          uniqueNews.push({
            title: cleanTitle, // 見出しのみ
            link: item.link,
            date: new Date(item.pubDate).toISOString(), // ソート用にISO形式で保存
            tag: getCategory(item.title),
            source: extractSource(item, source.name) // 配信元のみ
          });
          seenTitles.add(normalizedKey);
        }
      });
    } catch (e) { console.error(`Error in ${source.name}: ${e.message}`); }
  }

  if (uniqueNews.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    fs.writeFileSync("data/news.json", JSON.stringify({ updatedAt: new Date().toISOString(), items: uniqueNews }, null, 2));
  }
})();
