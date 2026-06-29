import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0' } });

// 1. 分類関数
function getCategory(title) {
  if (/金融|政策|金利|為替|ドル円|日銀|FRB|財務省/.test(title)) return "金融・政策";
  if (/再開発|竣工|移転|建設|インフラ|駅前|開発/.test(title)) return "開発・建設";
  if (/マンション|不動産|地価|価格|分譲|住宅/.test(title)) return "不動産市場";
  return "その他";
}

// 2. ソース取得関数（Yahoo!等の配信元を可能な限りクリーンにする）
function extractSource(item, defaultName) {
  if (item.source && item.source.title) return item.source.title;
  if (item.title.includes(" - ")) {
    let parts = item.title.split(" - ");
    let source = parts.pop();
    // Yahooやポータルサイト名なら、記事タイトル部分を返す
    if (/Yahoo!|au Web|ｄメニュー|Infoseek|ニコニコ|PR TIMES/.test(source)) {
      return parts.join(" - ");
    }
    return source;
  }
  return defaultName;
}

// 3. 1週間前の日付を自動生成
const oneWeekAgo = new Date();
oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
const dateQuery = `after:${oneWeekAgo.toISOString().split('T')[0]}`;

// 4. ソース定義
const sources = [
  { name: "ブルームバーグ", url: encodeURI(`https://news.google.com/rss/search?q=site:bloomberg.co.jp+不動産+金利+マンション+地価+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "日銀", url: encodeURI(`https://news.google.com/rss/search?q=site:boj.or.jp+金融政策+金利+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "ロイター", url: encodeURI(`https://news.google.com/rss/search?q=site:reuters.com+日本+不動産+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "国交省", url: encodeURI(`https://news.google.com/rss/search?q=site:mlit.go.jp+不動産+住宅+統計+${dateQuery}&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "不動産市況", url: encodeURI(`https://news.google.com/rss/search?q=不動産+マンション+地価+${dateQuery}+-site:jutaku-s.com&hl=ja&gl=JP&ceid=JP:ja`) },
  { name: "金融政策", url: encodeURI(`https://news.google.com/rss/search?q=日銀+金融政策+金利+住宅ローン+${dateQuery}+-site:jutaku-s.com&hl=ja&gl=JP&ceid=JP:ja`) }
];

// 5. 実行処理
(async () => {
  const uniqueNews = [];
  const seenTitles = new Set();

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      feed.items.forEach(item => {
        // 重複排除のための正規化：【】()や配信元を削除して純粋なタイトルにする
        const normalizedTitle = item.title
          .replace(/【.*?】/g, '')
          .replace(/\(.*?\)/g, '')
          .replace(/\s*-\s*.*$/, '')
          .trim()
          .substring(0, 15);

        if (!seenTitles.has(normalizedTitle)) {
          uniqueNews.push({
            title: item.title,
            link: item.link,
            date: item.pubDate ? new Date(item.pubDate).toLocaleDateString('ja-JP') : "日付不明",
            tag: getCategory(item.title),
            source: extractSource(item, source.name)
          });
          seenTitles.add(normalizedTitle);
        }
      });
    } catch (e) { console.error(`Error in ${source.name}: ${e.message}`); }
  }

  // 保存
  if (uniqueNews.length > 0) {
    if (!fs.existsSync("data")) fs.mkdirSync("data");
    const output = {
      updatedAt: new Date().toISOString(),
      items: uniqueNews
    };
    fs.writeFileSync("data/news.json", JSON.stringify(output, null, 2));
  }
})();
