import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser();

const feeds = [
  "https://news.google.com/rss/search?q=日銀+利上げ&hl=ja&gl=JP&ceid=JP:ja",
  "https://news.google.com/rss/search?q=住宅ローン+金利&hl=ja&gl=JP&ceid=JP:ja",
  "https://news.google.com/rss/search?q=変動金利&hl=ja&gl=JP&ceid=JP:ja"
];

function detectCategory(title){
  if(title.includes("日銀")) return "日銀";
  if(title.includes("住宅ローン")) return "住宅ローン";
  if(title.includes("金利")) return "金利";
  if(title.includes("不動産")) return "不動産";
  return "ニュース";
}

(async () => {

  let items = [];

  for (const url of feeds) {

    const feed = await parser.parseURL(url);

    feed.items.forEach(item => {

      items.push({
        title: item.title.replace(/ - .*$/, ""),
        link: item.link,
        date: item.pubDate,
        category: detectCategory(item.title)
      });

    });

  }

  // 重複削除
  const unique = Array.from(
    new Map(items.map(i => [i.title, i])).values()
  );

  // 最新順
  unique.sort((a,b) => new Date(b.date) - new Date(a.date));

  fs.writeFileSync(
    "news.json",
    JSON.stringify(unique.slice(0, 20), null, 2)
  );

})();
