import fs from "fs";
import Parser from "rss-parser";

const parser = new Parser();

const feeds = [
  "https://news.google.com/rss/search?q=日銀+利上げ&hl=ja&gl=JP&ceid=JP:ja",
  "https://news.google.com/rss/search?q=住宅ローン+金利&hl=ja&gl=JP&ceid=JP:ja",
  "https://news.google.com/rss/search?q=変動金利&hl=ja&gl=JP&ceid=JP:ja"
];

function detectCategory(t){
  if(t.includes("日銀")) return "日銀";
  if(t.includes("住宅ローン")) return "住宅ローン";
  if(t.includes("金利")) return "金利";
  if(t.includes("不動産")) return "不動産";
  return "ニュース";
}

(async () => {

  let items = [];

  for(const url of feeds){

    const feed = await parser.parseURL(url);

    for(const item of feed.items){

      items.push({
        title: item.title.replace(/ - .*$/, ""),
        link: item.link,
        date: item.pubDate,
        category: detectCategory(item.title)
      });

    }
  }

  // 重複削除
  const unique = [...new Map(items.map(i => [i.title, i])).values()];

  // 新しい順
  unique.sort((a,b)=> new Date(b.date) - new Date(a.date));

  fs.writeFileSync(
    "news.json",
    JSON.stringify(unique.slice(0,20), null, 2)
  );

  console.log("news.json updated");

})();
